import type { ExtensionRegistry } from '../registry'
import type { ExtensionDef, ExtId } from './ext'
import type { PkgInfo } from './pkg'
import type { ExtPortPaths, Pointer, PortPathPayload } from './topo'

export type PostOpts = {}
export type ExtensionUnavailable = undefined

export type PortShell<Payload = any> = {
  message: Message<Payload>
  cwPointer: Pointer
  pkgInfo: PkgInfo

  listen: Listen
  push: PushMessage

  registry: ShellExtensionRegistry
}
export type ShellExtensionRegistry = Omit<ExtensionRegistry, 'unregisterExtension' | 'registerExtension'>

export type Listen<Payload = any> = (_: PortListener<Payload>) => Unlisten
export type PortListener<Payload = any> = (shell: PortShell<Payload>) => void
export type Unlisten = () => void
export type PushMessage = <Ext extends ExtensionDef = ExtensionDef>(
  extId: ExtId<Ext>,
) => <Path extends ExtPortPaths<Ext>>(
  path: Path,
) => (payload: PortPathPayload<Ext, Path>) => Message<PortPathPayload<Ext, Path>>

export type MsgID = string
export type Message<Payload> = {
  id: MsgID
  target: Pointer
  source: Pointer
  payload: Payload
  parentMsgId: MsgID | null
  ctx: Record<string, any>
  consumedBy?: {
    pointer: Pointer
    pkgId: { name: string; version: string }
  }
}
