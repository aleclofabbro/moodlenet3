import { portGates, shellGatesTopologyOf } from '../extension/topology'
import {
  ExtensionDef,
  ExtensionId,
  GatesTopology,
  ShellGatedExtension,
} from '../extension/types'
import { extEnv } from '../kernel'
import { PkgInfo } from '../pkg-info/types'
import { PortAddress } from '../port-address/types'
import { Session, ShellLookup } from '../types'

const extensionRegistry: {
  [pkgName: string]: ExtensionRegistryRecord<ExtensionDef>
} = {}
export const getExtensions = () => Object.values(extensionRegistry)
export const lookupFor =
  (session: Session, source: PortAddress): ShellLookup =>
  (name) => {
    const ext = getRegisteredExtension(name)
    if (!ext) {
      return
    }
    const shellGatesTopology = shellGatesTopologyOf(ext.gates, session, source)
    const shellGatedExtension: ShellGatedExtension = {
      gates: shellGatesTopology,
      id: ext.id,
    }
    return shellGatedExtension
  }
type ExtensionRegistryRecord<ExtDef extends ExtensionDef> = {
  def: ExtDef
  active: boolean
  env: any
  id: ExtensionId
  gates: GatesTopology<ExtDef['ports']>
  pkgInfo: PkgInfo
}
export function getRegisteredExtension(pkgName: string) {
  return extensionRegistry[pkgName]
}

export function assertRegisteredExtension(pkgName: string) {
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
export function registerExtension<Def extends ExtensionDef>({
  def,
  pkgInfo,
}: {
  def: Def
  pkgInfo: PkgInfo
}) {
  const pkgName = pkgInfo.json.name
  assertNotRegisteredExtension(pkgName)
  const env = extEnv(pkgName)
  const id: ExtensionId = { name: def.name, version: def.version }
  const gates = portGates(id, def.ports, [])
  const extRegRec: ExtensionRegistryRecord<Def> = {
    def,
    id,
    active: false,
    env,
    pkgInfo,
    gates,
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
