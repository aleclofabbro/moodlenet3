import { coreExt, K } from '@moodlenet/core'
import { rename, rm, stat, writeFile } from 'fs/promises'
import { join, resolve } from 'path'
import { inspect, promisify } from 'util'
import webpack from 'webpack'

const wpCfg = require('../webpack.config')

const latestBuildFolder = join(__dirname, '..', 'latest-build')
const oldLatestBuildFolder = `${latestBuildFolder}__old`
// const buildFolder = join(__dirname, '..', 'build')
const extAliases: {
  [extId: string]: { moduleLoc: string; cmpPath: string }
} = {}

export type WebappExt = K.ExtDef<
  'moodlenet.webapp',
  '0.1.10',
  {
    ensureExtension: K.Port<'in', { cmpPath: string }>
  }
>
const extImpl: K.Ext<WebappExt, [K.KernelExt, coreExt.priHttp.MNPriHttpExt]> = {
  id: 'moodlenet.webapp@0.1.10',
  displayName: 'webapp',
  requires: ['kernel.core@0.1.10', 'moodlenet.pri-http@0.1.10'],
  enable(shell) {
    return {
      deploy(/* { tearDown } */) {
        shell.msg$.subscribe(msg => {
          K.onMessage<WebappExt>(msg)('moodlenet.webapp@0.1.10::ensureExtension', msg => {
            const { extId } = K.splitPointer(msg.pointer)
            const extDepl = shell.getExt(extId)
            console.log('....ensureExtension', msg)
            if (!extDepl?.pkgDiskInfo) {
              throw new Error(`${msg.pointer}: extId ${extId} not deployed`)
            }
            extAliases[extId] = {
              cmpPath: msg.data.cmpPath,
              moduleLoc: extDepl.pkgDiskInfo.mainModPath,
            }
            buildAndClean()
          })
        })
        shell.onExtInstance<coreExt.priHttp.MNPriHttpExt>('moodlenet.pri-http@0.1.10', (inst /* , depl */) => {
          const { express, mount } = inst(shell)
          const mountApp = express()
          const staticWebApp = express.static(latestBuildFolder, {})
          mountApp.use(staticWebApp)
          mount({ mountApp, absMountPath: '/' })
        })
        buildAndClean()
        return {}
      },
    }
  },
}

export default [extImpl]

async function buildAndClean() {
  await build()
  await removeOldLatestBuildFolder()
}

async function build() {
  console.log('--BUILD WEBAPP')

  const extensionsJsFileName = resolve(__dirname, '..', 'extensions.js' /* 'src', 'webapp', 'extensions.ts' */)
  console.log(`generate extensions.js ....`, { extensionsJsFileName })
  await writeFile(extensionsJsFileName, extensionsJsString(), { encoding: 'utf8' })

  const config: webpack.Configuration = wpCfg({}, { mode: 'production', watch: false })
  const webpackAliases = Object.entries(extAliases).reduce(
    (aliases, [extName, { moduleLoc }]) => ({
      ...aliases,
      [extName]: moduleLoc,
    }),
    {},
  )
  config.resolve!.alias = { ...config.resolve!.alias, ...webpackAliases }
  console.log(`Extension aliases ....`, inspect({ /* config,  */ extAliases, webpackAliases }, false, 6, true))

  const wp = webpack(config)
  const runWp = promisify(wp.run.bind(wp))
  const wpStats = await runWp()
  if (wpStats?.hasErrors()) {
    throw new Error(`Webpack build error: ${wpStats.toString()}`)
  }
  console.log(`Webpack build done`)
  const latestBuildFolderStat = await stat(latestBuildFolder)
  await removeOldLatestBuildFolder()
  if (latestBuildFolderStat.isDirectory()) {
    await rename(latestBuildFolder, oldLatestBuildFolder)
  }
  console.log(`renaming output to latestBuildFolder..`)
  await rename(config.output!.path!, latestBuildFolder)
  await removeOldLatestBuildFolder()
  console.log(`build done`)
}

async function removeOldLatestBuildFolder() {
  console.log(`removing oldLatestBuildFolder...`)
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
