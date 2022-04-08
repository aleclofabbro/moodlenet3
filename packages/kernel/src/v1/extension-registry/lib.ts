import { satisfies } from 'semver'
import { ExtEnv, ExtId, ExtImpl, ExtLCStop, splitExtId, Version } from '../extension/types'
import { PkgInfo } from '../pkg-info/types'

export type ExtensionRegistryHash = {
  [ExtName in string]: ExtensionRegistryRecord
}
export type Deployment = {
  at: Date
  stop: ExtLCStop
}
export type ExtensionRegistryRecord<_ExtId extends ExtId = ExtId> = {
  extId: _ExtId
  env: ExtEnv
  deployment: 'deploying' | Deployment | undefined
  pkgInfo: PkgInfo
  lifeCycle: ExtImpl
}

export type ExtensionRegistry = ReturnType<typeof createLocalExtensionRegistry>
export const createLocalExtensionRegistry = () => {
  //FIXME: make `extensionRegistry` an ExtensionRegistryRecord[]
  // to support multiple extension impl with same name
  // from different packages
  const extensionRegistry: ExtensionRegistryHash = {}
  // any subsequent query by name for a regRec would return arrays
  // or maybe-one cross-checking the pkgName too
  //FIXME

  return {
    getExtensions,
    getRegisteredExtension,
    assertRegisteredExtension,
    registerExtension,
    //unregisterExtension,
    getCompatibleRegisteredExtension,
    assertCompatibleRegisteredExtension,
  }

  function getExtensions() {
    return Object.values(extensionRegistry)
  }
  function getRegisteredExtension(extName: string) {
    return extensionRegistry[extName]
  }

  function getCompatibleRegisteredExtension(requestedExtId: ExtId) {
    const reqExt = splitExtId(requestedExtId)
    const extRecord = getRegisteredExtension(reqExt.extName)
    if (!extRecord) {
      return 'NOT_REGISTERED' as const
    }

    const availableExt = splitExtId(extRecord.extId)
    if (!versionSatisfies(availableExt.version, reqExt.version)) {
      return 'VERSION_MISMATCH' as const
    }
    return extRecord
  }

  function assertCompatibleRegisteredExtension(requestedExtId: ExtId, acceptUndeployed = false) {
    const extRecord = getCompatibleRegisteredExtension(requestedExtId)
    if (extRecord === 'NOT_REGISTERED') {
      throw new Error(`requested extension [${requestedExtId}] not registered`)
    } else if (extRecord === 'VERSION_MISMATCH') {
      throw new Error(`requested extension [${requestedExtId}] registered but not compatible`)
    }
    if (!(acceptUndeployed || extRecord.deployment)) {
      throw new Error(`requested extension ${requestedExtId} not deployed`)
    }

    return extRecord
  }

  function assertRegisteredExtension(extName: string, acceptUndeployed = false) {
    const ext = getRegisteredExtension(extName)
    if (!ext) {
      throw new Error(`requested extension ${extName} not registered`)
    }
    if (!(acceptUndeployed || ext.deployment)) {
      throw new Error(`requested extension ${extName} not deployed`)
    }
    return ext
  }

  function assertNotRegisteredExtension(extName: string) {
    const ext = getRegisteredExtension(extName)
    if (ext) {
      throw new Error(`extension package ${extName} already registered`)
    }
  }
  // function registeredExtensionOf(node_module: NodeModule) {
  //   const pkgInfo = pkgInfoOf(node_module)
  //   if (!pkgInfo?.json.name) {
  //     return undefined
  //   }
  //   return getRegisteredExtension(pkgInfo?.json.name)
  // }
  function registerExtension<_ExtId extends ExtId>({
    extId,
    pkgInfo,
    lifeCycle,
    env,
  }: {
    extId: _ExtId
    pkgInfo: PkgInfo
    lifeCycle: ExtImpl
    env: ExtEnv
  }) {
    const pkgName = pkgInfo.json.name
    const { extName } = splitExtId(extId)
    assertNotRegisteredExtension(extName)
    const extRegRec: ExtensionRegistryRecord<_ExtId> = {
      deployment: undefined,
      pkgInfo,
      extId,
      lifeCycle,
      env,
    }

    return (extensionRegistry[pkgName] = extRegRec)
  }
}

export function versionSatisfies(target: Version, requested: Version) {
  return satisfies(target, `^${requested}`)
}
