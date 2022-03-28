import execa from 'execa'
export type PkgMngLib = {
  // rootDir: string
  install: (pkgs: string[], strict?: boolean) => execa.ExecaChildProcess<string>
  uninstall: (pkgs: string[]) => execa.ExecaChildProcess<string>
  // nodeModulesDir: string
  version: string
}
// export const rootDir = process.env.MOODLENET_PKG_MNG_ROOT_DIR
// if (!rootDir) {
//   throw new Error(`bare-metal: needs a valid process.env.PKG_MNG_ROOT_DIR : ${process.env.PKG_MNG_ROOT_DIR}`)
// }
// export const kernelPkg = process.env.MOODLENET_PKG_MNG_KERNEL_PKG
// if (!kernelPkg) {
//   throw new Error(
//     `bare-metal: needs a valid process.env.MOODLENET_PKG_MNG_KERNEL_PKG : ${process.env.MOODLENET_PKG_MNG_KERNEL_PKG}`,
//   )
// }
// export const kernelModule = process.env.MOODLENET_PKG_MNG_KERNEL_MODULE
// if (!kernelModule) {
//   throw new Error(
//     `bare-metal: needs a valid process.env.MOODLENET_PKG_MNG_KERNEL_MODULE : ${process.env.MOODLENET_PKG_MNG_KERNEL_MODULE}`,
//   )
// }
// const nodeModulesDir = `${rootDir}/node_modules`

// console.log({
//   rootDir,
//   kernelPkg,
//   kernelModule,
//   nodeModulesDir,
// })

export const makePkgMng = (cwd: string) => {
  const execa_opts: execa.Options = { cwd }

  const install = (pkgs: string[], strict = true) =>
    execa('yarn', ['install', '--force --save', ...(strict ? ['--strict-peer-deps'] : []), ...pkgs], execa_opts)
  const uninstall = (pkgs: string[]) => execa('yarn', ['rm', ...pkgs], execa_opts)

  const pkgMngHandle: PkgMngLib = {
    install,
    uninstall,
    version: '1',
  }
  return pkgMngHandle
}
