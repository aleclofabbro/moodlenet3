import { v1 } from '@moodlenet/kernel/lib'
import { ExtensionId, PortShell } from '@moodlenet/kernel/lib/v1'
import type { MNPriHttpExt } from '@moodlenet/pri-http/pkg'
import { rm, writeFile } from 'fs'
import throttle from 'lodash/fp/throttle'
import { join, resolve } from 'path'
import { inspect } from 'util'
import webpack from 'webpack'

const wpCfg = require('../webpack.config')

const buildFolder = join(__dirname, '..', 'build')
const extAliases: {
  [pkgName: string]: { moduleLoc: string; cmpPath: string }
} = {}

export type WebappExt = typeof webappExt
const webappExt = v1.Extension(module, {
  name: '@moodlenet/webapp' as const,
  version: '1.0.0' as const,
  ports: {
    activate(shell) {
      v1.watchExt<MNPriHttpExt>(shell, '@moodlenet/pri-http', priHttp => {
        // console.log('webapp watched priHttp ', priHttp)
        if (!priHttp) {
          return
        }
        priHttp.gates.setWebAppRootFolder({ payload: { folder: buildFolder } })
      })
      build()
    },
    ensureExtension: v1.ExtPort({}, (shell: PortShell<{ extId: ExtensionId; moduleLoc: string; cmpPath: string }>) => {
      const { moduleLoc, extId, cmpPath } = shell.message.payload
      extAliases[extId.name] = { moduleLoc, cmpPath }
      build()
    }),
    deactivate() {},
  },
})
const build = throttle(1000)(
  () =>
    new Promise<void>((res, reject) => {
      rm(buildFolder, { maxRetries: 5, retryDelay: 500, force: true, recursive: true }, err => {
        if (err) {
          console.error(`rm build error`, err)
          return reject(err)
        }

        const extensionsJsFileName = resolve(__dirname, '..', 'extensions.js')
        console.log(`generate extensions.js ....`, { extensionsJsFileName })
        writeFile(extensionsJsFileName, extensionsJsString(), { encoding: 'utf8' }, err => {
          if (err) {
            console.error(`writeFile extensions error`, err)
            return reject(err)
          }

          const config: webpack.Configuration = wpCfg({}, { mode: 'development' })
          const webpackAliases = Object.entries(extAliases).reduce(
            (aliases, [pkgName, { moduleLoc }]) => ({
              ...aliases,
              [pkgName]: moduleLoc,
            }),
            {},
          )
          ;(config.resolve ?? {}).alias = { ...config.resolve?.alias, ...webpackAliases }
          console.log(`Webpack build ....`, inspect({ config, extAliases, webpackAliases }, false, 6, true))
          webpack(config, (err, stats) => {
            if (err || stats.hasErrors()) {
              console.error(`Webpack build error`, err ?? stats.toString())
              return reject(err ?? stats)
            }
            console.log(`Webpack build done`)
            res()
          })
        })
      })
    }),
)
function extensionsJsString() {
  const requiresAndPush = Object.entries(extAliases)
    .map(([pkgName, { cmpPath }]) => `extensions.push( [ '${pkgName}', require('${pkgName}/${cmpPath}').Cmp ] )`)
    .join('\n')

  return `  
const extensions = []
${requiresAndPush}

module.exports = extensions
module.exports.default = extensions
`
}
