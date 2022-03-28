import { ExtensionId, ExtLCStop, ExtLifeCycleHandle } from '../extension/types'
import { PkgInfo } from '../pkg-info/types'

export type ExtensionRegistry = {
  [ExtId in string]: ExtensionRegistryRecord
}
export type Deployment = {
  at: Date
  stop: ExtLCStop
}
export type ExtensionRegistryRecord<ExtId extends ExtensionId = ExtensionId> = {
  id: ExtId
  deployment: 'deploying' | Deployment | undefined
  pkgInfo: PkgInfo
  lifeCycle: ExtLifeCycleHandle
}
export const createLocalExtensionRegistry = () => {
  const extensionRegistry: ExtensionRegistry = {}

  return {
    getExtensions,
    getRegisteredExtension,
    assertRegisteredExtension,
    registerExtension,
  }

  function getExtensions() {
    return Object.values(extensionRegistry)
  }
  function getRegisteredExtension(pkgName: string) {
    return extensionRegistry[pkgName]
  }

  function assertRegisteredExtension(pkgName: string) {
    const ext = getRegisteredExtension(pkgName)
    if (!ext) {
      throw new Error(`extension package ${pkgName} not registered`)
    }
    return ext
  }
  function assertNotRegisteredExtension(pkgName: string) {
    const ext = getRegisteredExtension(pkgName)
    if (ext) {
      throw new Error(`extension package ${pkgName} already registered`)
    }
  }
  // function registeredExtensionOf(node_module: NodeModule) {
  //   const pkgInfo = pkgInfoOf(node_module)
  //   if (!pkgInfo?.json.name) {
  //     return undefined
  //   }
  //   return getRegisteredExtension(pkgInfo?.json.name)
  // }
  function registerExtension<ExtId extends ExtensionId>({
    id,
    pkgInfo,
    lifeCycle,
  }: {
    id: ExtId
    pkgInfo: PkgInfo
    lifeCycle: ExtLifeCycleHandle
  }) {
    const pkgName = pkgInfo.json.name

    if (id.name !== pkgName) {
      throw new Error(`package.json name and provided extension name must exactly match !`)
    }
    if (id.version !== pkgInfo.json.version) {
      throw new Error(`package.json version and provided extension version must exactly match !`)
    }
    assertNotRegisteredExtension(pkgName)
    const extRegRec: ExtensionRegistryRecord<ExtId> = {
      deployment: undefined,
      pkgInfo,
      id,
      lifeCycle,
    }

    return (extensionRegistry[pkgName] = extRegRec)
  }

  // function assertRegisteredExtensionOf(node_module: NodeModule) {
  //   const ext = registeredExtensionOf(node_module)

  //   if (!ext) {
  //     throw new Error(
  //       `No registered Extension for module ${node_module.filename}`
  //     )
  //   }

  //   return ext
  // }
}
