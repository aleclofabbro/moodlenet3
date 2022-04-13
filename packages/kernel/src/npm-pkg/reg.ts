import { isVerBWC, splitExtId } from '../k/pointer'
import type { Ext, ExtDef, ExtDeployment, ExtId, ExtName, PkgDiskInfo, Version } from '../types'

async function installPkg({ pkgLoc }: { pkgLoc: string }) {
  const [info, installResp] = await Promise.all([pkgMng.info(pkgLoc), pkgMng.install(pkgLoc)])
  console.log(info, installResp.all)
  const exts: Ext[] = bareMetal.modRequire(info.name).default
  const pkgInfo = pkgInfoOf(pkgLoc)
  if (pkgInfo instanceof Error) {
    return pkgInfo
  }
  localExtReg.registerPkg({ exts, pkgInfo })
}

export type ExtensionRegistry = ReturnType<typeof createLocalExtensionRegistry>

export const createLocalExtensionRegistry = () => {
  const pkgRegistry: PkgRegistryRecord[] = []

  return {
    pkgRegistry,
    findPkgRegsWithExt,
    assertFindPkgRegsWithExt,
    registerPkg,
    unregisterPkg,
    findDeployedExtName,
    findDeployedExtId,
    assertFindDeployedExtName,
    assertFindDeployedExtId,
  }

  function findDeployedExtName<Name extends ExtName = ExtName>(findExtName: Name) {
    const pkg = findPkgRegsWithExt<Name>(findExtName, { matchDeployed: true })[0]
    if (!pkg) {
      return undefined
    }
    const extRegs = pkg.extRegs
    if (!extRegs.length) {
      return undefined
    }
    return { pkg, extRegs }
  }

  function assertFindDeployedExtName<Name extends ExtName = ExtName>(findExtName: Name) {
    const found = findDeployedExtName<Name>(findExtName)
    if (!found) {
      throw new Error(`assertFindDeployedExtName: requested extension ${findExtName} not found`)
    }
    return found
  }

  function findDeployedExtId<Def extends ExtDef = ExtDef>(findExtId: ExtId<Def>) {
    const { extName, version } = splitExtId(findExtId)
    const pkg = findPkgRegsWithExt<Def['name']>(extName, { matchDeployed: true, verCompatible: version })[0]
    if (!pkg) {
      return undefined
    }
    const extReg = pkg.extRegs[0]
    if (!extReg) {
      return undefined
    }
    return { pkgInfo: pkg.pkgInfo, extReg }
  }
  function assertFindDeployedExtId<Def extends ExtDef = ExtDef>(findExtId: ExtId<Def>) {
    const found = findDeployedExtId<Def>(findExtId)
    if (!found) {
      throw new Error(`assertFindDeployedExtId: requested extension ${findExtId} not deployed`)
    }
    return found
  }

  type FindOpts = {
    verCompatible?: Version
    matchDeployed: boolean
  }

  function findPkgRegsWithExt<Name extends ExtName>(findExtName: Name, _opts?: Partial<FindOpts>) {
    const opts: FindOpts = {
      matchDeployed: false,
      ..._opts,
    }
    return pkgRegistry
      .map(pkgReg => {
        const matchingRegs = pkgReg.extRegs.filter(({ extId, deployment }) => {
          const { extName, version } = splitExtId(extId)
          const nameMatch = extName === findExtName
          const verMatch = opts.verCompatible === undefined ? true : isVerBWC(version, opts.verCompatible)
          const matchDeployed = opts.matchDeployed ? !!deployment : true
          return nameMatch && verMatch && matchDeployed
        })
        if (!matchingRegs.length) {
          return null
        }
        const match: PkgRegistryRecord = {
          ...pkgReg,
          extRegs: matchingRegs,
        }
        return match
      })
      .filter((_): _ is PkgRegistryRecord => !!_)
  }

  function assertFindPkgRegsWithExt<Name extends ExtName>(findExtName: Name, _opts?: Partial<FindOpts>) {
    const matches = findPkgRegsWithExt<Name>(findExtName, _opts)

    if (!matches.length) {
      throw new Error(
        `no ${_opts?.matchDeployed ? 'deployed' : 'registered'} pkg with extension matching [${findExtName}@${
          _opts?.verCompatible ?? '*'
        }]`,
      )
    }

    return matches
  }

  function registerPkg({ pkgInfo, exts }: { pkgInfo: PkgDiskInfo; exts: Ext[] }) {
    const extRegs = exts.map(extToExtReg)
    const extRegRec: PkgRegistryRecord = {
      pkgInfo,
      extRegs,
    }

    pkgRegistry.push(extRegRec)
    return extRegRec
  }

  function unregisterPkg(extRegRec: PkgRegistryRecord) {
    return pkgRegistry.splice(pkgRegistry.indexOf(extRegRec), 1)[0]
  }
  // function assertRegisteredExtension(extName: string, acceptUndeployed = false) {
  //   const ext = findPckgRegsWithExt(extName)
  //   if (!ext) {
  //     throw new Error(`requested extension ${extName} not registered`)
  //   }
  //   if (!(acceptUndeployed || ext.deployment)) {
  //     throw new Error(`requested extension ${extName} not deployed`)
  //   }
  //   return ext
  // }

  // function assertNotRegisteredExtension(extName: string) {
  //   const ext = findPckgRegsWithExt(extName)
  //   if (ext) {
  //     throw new Error(`extension package ${extName} already registered`)
  //   }
  // }
  // function registeredExtensionOf(node_module: NodeModule) {
  //   const pkgInfo = pkgInfoOf(node_module)
  //   if (!pkgInfo?.json.name) {
  //     return undefined
  //   }
  //   return getRegisteredExtensions(pkgInfo?.json.name)
  // }
}

export function extToExtReg<Def extends ExtDef = ExtDef>(ext: Ext<Def>): ExtDeployment<Def> {
  return {
    deployment: undefined,
    ext,
    extId: ext.id,
  }
}
