import type { ExtensionRegistry } from '../registry'
import type {
  call,
  extCall,
  extInvoke,
  invoke,
  probeExt,
  probePort,
  reply,
  replyAll,
  retrn,
  retrnAll,
  useExtension,
  watchExt,
} from '../shell-lib'
import type { ExtensionDef, ExtId } from './ext'
import type { PkgInfo } from './pkg'
import type { ExtPortPaths, Pointer, PortPathPayload } from './topo'

export type PostOpts = {}
export type ExtensionUnavailable = undefined

export type Listen = (_: PortListener) => Unlisten
export type PortListener = (shell: ListenerShell) => void
export type Unlisten = () => void

export type ListenerShell = PortShell & ShellLib
export type ShellLib = {
  replyAll: typeof replyAll
  reply: typeof reply
  useExtension: typeof useExtension
  watchExt: typeof watchExt
  retrn: typeof retrn
  retrnAll: typeof retrnAll
  extInvoke: typeof extInvoke
  invoke: typeof invoke
  probePort: typeof probePort
  probeExt: typeof probeExt
  call: typeof call
  extCall: typeof extCall
}

export type PortShell<Payload = any> = {
  message: Message<Payload>
  registry: ShellExtensionRegistry
  listen: Listen
  cwPointer: Pointer
  push: PushMessage
  pkgInfo: PkgInfo
}
export type ShellExtensionRegistry = Omit<ExtensionRegistry, 'unregisterExtension' | 'registerExtension'>

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
