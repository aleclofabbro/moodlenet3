import type { Extension } from './Extension'
import { pkgInfoOf } from './pkg-info'

export const ExtensionRegistry: { [rootDir: string]: Extension } = {}

export const getRegisteredExtension = (pkgName: string) =>
  ExtensionRegistry[pkgName]

export function assertRegisteredExtension(pkgName: string) {
  const ext = getRegisteredExtension(pkgName)
  if (!ext) {
    throw new Error(`extension package ${pkgName} not registered`)
  }
  return ext
}
export function assertNotRegisteredExtension(pkgName: string) {
  const ext = getRegisteredExtension(pkgName)
  if (ext) {
    throw new Error(`extension package ${pkgName} already registered`)
  }
}

export function registeredExtensionOf(node_module: NodeModule) {
  const pkgInfo = pkgInfoOf(node_module)
  if (!pkgInfo?.pkg_json.name) {
    return undefined
  }
  return getRegisteredExtension(pkgInfo?.pkg_json.name)
}

export function registerExtension(ext: Extension) {
  const rootDir = ext.pkgInfo.pkg_dir
  assertNotRegisteredExtension(rootDir)
  ExtensionRegistry[rootDir] = ext
}

export function assertRegisteredExtensionOf(node_module: NodeModule) {
  const pkg = registeredExtensionOf(node_module)

  if (!pkg) {
    throw new Error(
      `No registered Extension for module ${node_module.filename}`
    )
  }

  return pkg
}
