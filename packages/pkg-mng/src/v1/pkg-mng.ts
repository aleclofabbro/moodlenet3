import execa, { Options } from 'execa'
import { join } from 'path'
import { BootModule, PkgMngHandle } from './types'

export const rootDir = process.env.MOODLENET_PKG_MNG_ROOT_DIR
if (!rootDir) {
  throw new Error(`pkg-mng: needs a valid process.env.PKG_MNG_ROOT_DIR : ${process.env.PKG_MNG_ROOT_DIR}`)
}
export const kernelPkg = process.env.MOODLENET_PKG_MNG_KERNEL_PKG
if (!kernelPkg) {
  throw new Error(
    `pkg-mng: needs a valid process.env.MOODLENET_PKG_MNG_KERNEL_PKG : ${process.env.MOODLENET_PKG_MNG_KERNEL_PKG}`,
  )
}
export const kernelModule = process.env.MOODLENET_PKG_MNG_KERNEL_MODULE
if (!kernelModule) {
  throw new Error(
    `pkg-mng: needs a valid process.env.MOODLENET_PKG_MNG_KERNEL_MODULE : ${process.env.MOODLENET_PKG_MNG_KERNEL_MODULE}`,
  )
}
const nodeModulesDir = `${rootDir}/node_modules`

console.log({
  rootDir,
  kernelPkg,
  kernelModule,
  nodeModulesDir,
})
;(async () => {
  const execa_opts: Options = { cwd: rootDir }
  await execa('npm', ['init', '-y'], execa_opts)

  const install = (pkgs: string[], strict = true) =>
    execa('npm', ['install', '--save', ...(strict ? ['--strict-peer-deps'] : []), ...pkgs], execa_opts)
  const uninstall = (pkgs: string[]) => execa('npm', ['rm', ...pkgs], execa_opts)

  console.log(`installing kernel pkg: ${kernelPkg}`)

  await install([kernelPkg], false)

  console.log(`starting kernel`)

  const bootModule: BootModule = await import(join(rootDir, 'node_modules', ...kernelModule.split('/')))
  console.log(`kernel started`)
  const pkgMngHandle: PkgMngHandle = {
    rootDir,
    install,
    uninstall,
    nodeModulesDir,
    version: '1',
  }
  await bootModule.boot(pkgMngHandle)
})()
