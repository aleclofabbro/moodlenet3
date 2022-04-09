import { v1 } from '@moodlenet/kernel/lib'
import type { ExtensionDef, ExtensionId, ExtIdOf, RpcTopo } from '@moodlenet/kernel/lib/v1'
import type { MNPriHttpExt } from '@moodlenet/pri-http/pkg'
import { existsSync } from 'fs'
import { rename, rm, writeFile } from 'fs/promises'
import { debounce } from 'lodash'
import { join, resolve } from 'path'
import { inspect, promisify } from 'util'
import webpack from 'webpack'

const wpCfg = require('../webpack.config')

const latestBuildFolder = join(__dirname, '..', 'latest-build')
const oldLatestBuildFolder = `${latestBuildFolder}__old`
// const buildFolder = join(__dirname, '..', 'build')
const extAliases: {
  [pkgName: string]: { moduleLoc: string; cmpPath: string }
} = {}

export const webappExtId: ExtIdOf<WebappExt> = {
  name: '@moodlenet/webapp',
  version: '0.0.1',
} as const

export type WebappExt = ExtensionDef<
  '@moodlenet/webapp',
  '0.0.1',
  {
    ensureExtension: RpcTopo<(_: { extId: ExtensionId; moduleLoc: string; cmpPath: string }) => Promise<void>>
    ___CONTROL_PORT_REMOVE_ME_LATER___: RpcTopo<<T>(_: T) => Promise<{ _: T }>>
  }
>
v1.Extension(module, webappExtId, {
  async start({ shell }) {
    v1.watchExt<MNPriHttpExt>(shell, '@moodlenet/pri-http', priHttp => {
      // console.log('webapp watched priHttp ', priHttp)
      if (!priHttp?.active) {
        return
      }
      v1.____remove_me__asyncRequest<MNPriHttpExt>({ extName: '@moodlenet/pri-http', shell })({
        path: 'setWebAppRootFolder',
      })({
        folder: latestBuildFolder,
      })
    })
    v1.___remove_me___asyncRespond<WebappExt>({ extName: '@moodlenet/webapp', shell })({
      path: 'ensureExtension',
      afnPort:
        _shell =>
        async ({ cmpPath, extId, moduleLoc }) => {
          extAliases[extId.name] = { moduleLoc, cmpPath }
          build()
        },
    })
    await build()
    await removeOldLatestBuildFolder()
    return async () => {}
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
    console.log(`Extension aliases ....`, inspect({ /* config,  */ extAliases, webpackAliases }, false, 6, true))

    const wp = webpack(config)
    const runWp = promisify(wp.run.bind(wp))
    const stats = await runWp()
    if (stats?.hasErrors()) {
      throw new Error(`Webpack build error: ${stats.toString()}`)
    }
    console.log(`Webpack build done`)
    if (existsSync(latestBuildFolder)) {
      await rename(latestBuildFolder, oldLatestBuildFolder)
    }
    console.log(`renaming output to latestBuildFolder..`)
    await rename(config.output!.path!, latestBuildFolder)
    removeOldLatestBuildFolder()
    console.log(`build done`)
  },
  3000,
  { trailing: true },
)

function removeOldLatestBuildFolder() {
  console.log(`removing oldLatestBuildFolder..`)
  return rm(oldLatestBuildFolder, { maxRetries: 5, retryDelay: 500, force: true, recursive: true })
}

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
