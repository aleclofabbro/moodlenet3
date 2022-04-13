import { dirname, resolve } from 'path'
import packageDirectory from 'pkg-dir'
import type { PackageJson as NodePackageJson } from 'type-fest'
import type { PkgDiskInfo } from '../types'

export function pkgInfoOf(mainModPath: string): PkgDiskInfo | Error {
  const main_mod_dir = dirname(mainModPath)
  try {
    const rootDir = packageDirectory.sync(main_mod_dir)
    if (!rootDir) {
      throw new Error(`couldn't find or invalid package.json for main_mod_dir:${main_mod_dir}`)
    }

    const pkgJson: NodePackageJson = require(resolve(rootDir, 'package.json'))
    const name = pkgJson.name
    const version = pkgJson.version
    if (!name) {
      throw new Error(`package.json for module ${rootDir} has no name set`)
    }
    if (!version) {
      throw new Error(`package.json for module ${rootDir} has no version set`)
    }
    const pkgInfo: PkgDiskInfo = { rootDir, mainModPath, name, version }
    return pkgInfo
  } catch (e) {
    const cause = e instanceof Error ? e : new Error(String(e))
    return new Error(`couldn't get pkgInfo for main_mod_dir:${main_mod_dir}`, { cause })
  }
}

// FIXME: use manifest
// function isMNPackageJsonExt(_: any): _ is MNPackageJsonExt {
//   return (
//     !!_ &&
//     isOptString(_, 'displayName') &&
//     isOptString(_, 'description') &&
//     isOptString(_, 'webappExtensionFile') &&
//     isOptString(_, 'shortDesc')
//   )
// }

// function isOptString(_: any, p: string) {
//   return !!_ && (p in _ ? typeof _[p] === 'string' : true)
// }
