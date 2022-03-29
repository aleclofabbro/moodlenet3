import execa from 'execa'
import { resolve } from 'path'
export type PkgMngLib = {
  install: (pkgs: string, strict?: boolean) => Promise<execa.ExecaReturnValue<string>>
  uninstall: (pkg: string) => Promise<execa.ExecaReturnValue<string>>
  info: (pkg: string) => Promise<{ name: string; version: string }>
}

export const makePkgMng = (cwd: string): PkgMngLib => {
  const execa_opts: execa.Options = { cwd }

  const install = async (pkgLoc: string, strict = true) =>
    execa('npm', ['i', '--force --save', ...(strict ? ['--strict-peer-deps'] : []), pkgLoc], execa_opts)
  const uninstall = async (pkgLoc: string) => execa('npm', ['rm', pkgLoc], execa_opts)
  const info = async (pkgLoc: string) => {
    const isFolder = pkgLoc.startsWith('file:')
    if (isFolder) {
      const pkgJsonFile = resolve(pkgLoc.substring(5), 'package.json')
      // console.log({ pkgJsonFile })
      const pkgJson = require(pkgJsonFile)
      return {
        name: pkgJson.name,
        version: pkgJson.version,
      }
    } else {
      const infoData = await execa('npm', ['info', '--json', pkgLoc]).then(resp => JSON.parse(resp.stdout).data)
      // console.log({ infoData })
      const name = infoData.name
      const version = infoData.version
      return {
        name,
        version,
      }
    }
  }

  return {
    info,
    install,
    uninstall,
  }
}

// FROM : https://github.com/dword-design/package-name-regex/blob/master/src/index.js
// const pkgNameRegex = /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/
