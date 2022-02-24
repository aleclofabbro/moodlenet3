import { dirname, resolve } from 'path'
import packageDirectory from 'pkg-dir'
import { PackageJson } from 'type-fest'
import { inspect } from 'util'

export type MNPackageJsonExt = {
  name: string
  shortDesc: string
  description?: string
}
export type NodePackageJson = Omit<PackageJson, 'name' | 'version'> & {
  moodlenet: MNPackageJsonExt
  name: string
  version: string
}

export function pkgDirOf(node_module: NodeModule) {
  const mod_dir = dirname(node_module.filename)
  const pkg_dir = packageDirectory.sync(mod_dir)
  return pkg_dir
}

export interface PkgInfo {
  pkg_dir: string
  pkg_json: NodePackageJson
}
export function pkgInfoOf(node_module: NodeModule): PkgInfo {
  const pkg_dir = pkgDirOf(node_module)
  if (!pkg_dir) {
    throw new Error(
      `couldn't find package root for module ${node_module.filename}`
    )
  }
  let pkg_json: NodePackageJson
  try {
    pkg_json = require(resolve(pkg_dir, 'package.json'))
  } catch (e) {
    throw new Error(
      `couldn't find or invalid package.json for module ${
        node_module.filename
      } ${String(e)}`
    )
  }
  if (!pkg_json.name) {
    throw new Error(
      `package.json for module ${node_module.filename} has no name set`
    )
  }
  if (!pkg_json.version) {
    throw new Error(
      `package.json for module ${node_module.filename} has no version set`
    )
  }
  if (!isMNPackageJsonExt(pkg_json.moodlenet)) {
    throw new Error(
      `missing or invalid moodlenet manifest in ${pkg_dir} package.json ${inspect(
        pkg_json.moodlenet
      )}`
    )
  }
  return { pkg_dir, pkg_json }
}

function isMNPackageJsonExt(_: any): _ is MNPackageJsonExt {
  return (
    !!_ &&
    typeof _.name === 'string' &&
    typeof _.shortDesc === 'string' &&
    ('description' in _ ? typeof _.description === 'string' : true)
  )
}
