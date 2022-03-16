import { v1 } from '@moodlenet/kernel/lib'
import { AsyncPort, asyncRequest, asyncRespond, ExtensionId, ExtIdOf } from '@moodlenet/kernel/lib/v1'
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

export const webappExtId: ExtIdOf<WebappExt> = {
  name: '@moodlenet/webapp',
  version: '1.0.0',
} as const
export type WebappExt = {
  name: '@moodlenet/webapp'
  version: '1.0.0'
  ports: {
    ensureExtension: AsyncPort<(_: { extId: ExtensionId; moduleLoc: string; cmpPath: string }) => Promise<void>>
  }
}
v1.Extension(
  module,
  {
    name: '@moodlenet/webapp',
    version: '1.0.0',
  },
  {
    async start({ shell }) {
      v1.watchExt<MNPriHttpExt>(shell, '@moodlenet/pri-http', priHttp => {
        // console.log('webapp watched priHttp ', priHttp)
        if (!priHttp?.active) {
          return
        }
        asyncRequest<MNPriHttpExt>({ extName: '@moodlenet/pri-http', shell })({ path: 'setWebAppRootFolder' })({
          folder: latestBuildFolder,
        })
      })
      build()
      asyncRespond<WebappExt>({ extName: '@moodlenet/webapp', shell })({
        path: 'ensureExtension',
        afnPort:
          _shell =>
          async ({ cmpPath, extId, moduleLoc }) => {
            extAliases[extId.name] = { moduleLoc, cmpPath }
            build()
          },
      })
      return async () => {}
    },
  },
)

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
    console.log(`Webpack build ....`, inspect({ /* config,  */ extAliases, webpackAliases }, false, 6, true))

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
