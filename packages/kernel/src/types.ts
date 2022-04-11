import type { ExtensionRegistry } from './extension-registry'
import type { ExtensionDef, ExtId, ExtPortPaths, Pointer, PortPathPayload } from './extension/types'
import type { Message } from './message/types'
import type { PkgInfo } from './pkg'

export type PostOpts = {}
export type ExtensionUnavailable = undefined

// export type LookupExt = <Ext extends ExtensionDef>(extName: Ext['name']) => LookupResult<Ext> | undefined
// export type LookupResult<Ext extends ExtensionDef> = {
//   extId: ExtensionIdObj<Ext['name']>
//   active: boolean
//   pkgInfo: PkgInfo
// }

export type Listen = (_: PortListener) => Unlisten
export type PortListener = (shell: PortShell) => void
export type Unlisten = () => void

export type PortShell<Payload = any> = {
  message: Message<Payload>
  registry: ShellExtensionRegistry
  listen: Listen
  cwPointer: Pointer
  push: PushMessage
  pkgInfo: PkgInfo
}
export type ShellExtensionRegistry = Omit<ExtensionRegistry, 'unregisterExtension' | 'registerExtension'>
// export type PushMessage = <Ext extends ExtensionDef = ExtensionDef, Path extends ExtPortPaths<Ext> = ExtPortPaths<Ext>>(
//   target: Pointer<Ext, Path>,
// ) => (payload: PortPathPayload<Ext, Path>) => Message<PortPathPayload<Ext, Path>>

export type PushMessage = <Ext extends ExtensionDef = ExtensionDef>(
  extId: ExtId<Ext>,
) => <Path extends ExtPortPaths<Ext>>(
  path: Path,
) => (payload: PortPathPayload<Ext, Path>) => Message<PortPathPayload<Ext, Path>>
