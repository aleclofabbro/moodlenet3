import { ExecaChildProcess } from 'execa'

export type PkgMngHandle = {
  pkg_add: (pkgs: string[], strict?: boolean | undefined) => ExecaChildProcess<string>
  pkg_rm: (pkgs: string[]) => ExecaChildProcess<string>
  set_kernel_mod: (kernelMod: string) => void
  get_kernel_mod: () => string
  reboot: () => void
  modRequire: NodeRequire
  cwd: string
}

export type PkgMngLib = {
  // rootDir: string
  install: (pkgs: string[], strict?: boolean) => ExecaChildProcess<string>
  uninstall: (pkgs: string[]) => ExecaChildProcess<string>
  // nodeModulesDir: string
  version: string
}
export type Boot = (_: PkgMngLib) => Promise<unknown>
export type BootModule = {
  boot: Boot
}
