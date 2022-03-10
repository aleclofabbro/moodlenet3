import { join } from 'path'
import makeyarncli from './npm-cli'

export const rootDir = process.env.MOODLENET_PKG_MNG_ROOT_DIR
if (!rootDir) {
  throw new Error(`pkg-mng: needs a valid process.env.PKG_MNG_ROOT_DIR: ${process.env.PKG_MNG_ROOT_DIR}`)
}
export const kernelModule = process.env.MOODLENET_PKG_MNG_KERNEL_MODULE
if (!kernelModule) {
  throw new Error(
    `pkg-mng: needs a valid process.env.MOODLENET_PKG_MNG_KERNEL_MODULE: ${process.env.MOODLENET_PKG_MNG_KERNEL_MODULE}`,
  )
}

export const preinstallPkgs = (process.env.MOODLENET_PKG_MNG_PREINSTALL ?? '').split('\n').filter(Boolean)

console.log({
  rootDir,
  preinstallPkgs,
  kernelModule,
})
;(async () => {
  const npmcli = await makeyarncli(rootDir)

  console.log(`installing pkgs: ${preinstallPkgs}`)

  await npmcli.install(preinstallPkgs, false)

  const nodeModulesDir = `${rootDir}/node_modules`
  console.log(`starting kernel`)

  await require(join(rootDir, 'node_modules', ...kernelModule.split('/'))).boot({
    npmcli,
    rootDir,
    nodeModulesDir,
    version: '1',
  })

  console.log(`kernel started`)
})()
