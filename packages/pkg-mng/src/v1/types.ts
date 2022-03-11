import { ExecaChildProcess } from 'execa'

export type PkgMngHandle = {
  rootDir: string
  install: (pkgs: string[], strict?: boolean) => ExecaChildProcess<string>
  uninstall: (pkgs: string[]) => ExecaChildProcess<string>
  nodeModulesDir: string
  version: string
}

export type Boot = (_: PkgMngHandle) => Promise<unknown>
export type BootModule = {
  boot: Boot
}
