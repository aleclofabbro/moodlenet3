import { v1 } from '@moodlenet/kernel/lib'
import { ExtensionId, PortShell } from '@moodlenet/kernel/lib/v1'
import type { MNPriHttpExt } from '@moodlenet/pri-http/pkg'
import { rename, rm, writeFile } from 'fs/promises'
import { debounce } from 'lodash'
import { join, resolve } from 'path'
import { inspect, promisify } from 'util'
import webpack from 'webpack'

const wpCfg = require('../webpack.config')

const latestBuildFolder = join(__dirname, '..', 'latest-build')
// const buildFolder = join(__dirname, '..', 'build')
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
        priHttp.gates.setWebAppRootFolder({ payload: { folder: latestBuildFolder } })
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

// let runWp:Promise<webpack.Stats>|undefined
const build = debounce(
  async () => {
    console.log('BUILD WEBAPP')

    const extensionsJsFileName = resolve(__dirname, '..', 'extensions.js' /* 'src', 'webapp', 'extensions.ts' */)
    console.log(`generate extensions.js ....`, { extensionsJsFileName })
    await writeFile(extensionsJsFileName, extensionsJsString(), { encoding: 'utf8' })

    const config: webpack.Configuration = wpCfg({}, { mode: 'production', watch: false })
    const webpackAliases = Object.entries(extAliases).reduce(
      (aliases, [pkgName, { moduleLoc }]) => ({
        ...aliases,
        [pkgName]: moduleLoc,
      }),
      {},
    )
    config.resolve!.alias = { ...config.resolve!.alias, ...webpackAliases }
    console.log(`Webpack build ....`, inspect({ config, extAliases, webpackAliases }, false, 6, true))

    const wp = webpack(config)
    const runWp = promisify(wp.run.bind(wp))
    const stats = await runWp()
    if (stats?.hasErrors()) {
      throw new Error(`Webpack build error: ${stats.toString()}`)
    }
    console.log(`Webpack build done`)
    const oldLatestBuildFolder = `${latestBuildFolder}__old`
    await rename(latestBuildFolder, oldLatestBuildFolder)
    console.log(`renaming output to latestBuildFolder..`)
    await rename(config.output!.path!, latestBuildFolder)
    console.log(`removing oldLatestBuildFolder..`)
    await rm(oldLatestBuildFolder, { maxRetries: 5, retryDelay: 500, force: true, recursive: true })
    console.log(`build done`)
  },
  3000,
  { trailing: true },
)

function extensionsJsString() {
  // const requiresAndPush = Object.entries(extAliases)
  //   .map(([pkgName, { cmpPath }]) => `extensions.push( [ '${pkgName}', require('${pkgName}/${cmpPath}').Cmp ] )`)
  //   .join('\n')

  return `  
${Object.entries(extAliases)
  .map(([pkgName, { cmpPath }], index) => `module.exports['Cmp_${index}']= require('${pkgName}/${cmpPath}').default`)
  // .map(([pkgName, { cmpPath }], index) => `export { Cmp as Cmp_${index} } from '${pkgName}/${cmpPath}' //pkgName`)
  .join('\n')}
`
}
