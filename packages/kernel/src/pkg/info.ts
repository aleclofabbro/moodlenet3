import { dirname, resolve } from 'path'
import packageDirectory from 'pkg-dir'
import type { NodePackageJson, PkgInfo } from '../types'

export function pkgDirOf(node_module: NodeModule) {
  const mod_dir = dirname(node_module.filename)
  const dir = packageDirectory.sync(mod_dir)
  return dir
}

export function pkgInfoOf(node_module: NodeModule): PkgInfo {
  const dir = pkgDirOf(node_module)
  if (!dir) {
    throw new Error(`couldn't find package root for module ${node_module.filename}`)
  }
  let json: NodePackageJson
  try {
    json = require(resolve(dir, 'package.json'))
  } catch (e) {
    throw new Error(`couldn't find or invalid package.json for module ${node_module.filename} ${String(e)}`)
  }
  if (!json.name) {
    throw new Error(`package.json for module ${node_module.filename} has no name set`)
  }
  if (!json.version) {
    throw new Error(`package.json for module ${node_module.filename} has no version set`)
  }
  // FIXME: use manifest
  // if (!isMNPackageJsonExt(json.moodlenet)) {
  //   throw new Error(
  //     `missing or invalid moodlenet manifest in ${dir} package.json ${inspect(
  //       json.moodlenet
  //     )}`
  //   )
  // }
  return { dir, json }
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
