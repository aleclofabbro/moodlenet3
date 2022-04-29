import { ExtDef, ExtId } from './ext'
import type { Pointer, PortBinding, PortPathData, PortPaths } from './topo'

export type MsgID = string
export type Message<
  Bound extends PortBinding = PortBinding,
  SourceDef extends ExtDef = ExtDef,
  DestDef extends ExtDef = ExtDef,
  Path extends PortPaths<DestDef, Bound> = PortPaths<DestDef, Bound>,
> = {
  id: MsgID
  bound: Bound
  source: ExtId<SourceDef>
  pointer: Pointer<DestDef, Path>
  data: PortPathData<DestDef, Path, Bound>
  parentMsgId?: MsgID
  sub: boolean
  managedBy?: ExtId
  activeDest: ExtId<ExtDef<DestDef['name']>>
}

// export type PostOpts = {}
// export type ExtensionUnavailable = undefined

// export interface PortShell<Payload = any> {
//   message: Message<Payload>
//   cwPointer: Pointer
//   pkgInfo: PkgInfo
//   listen: Listen
//   push: PushMessage
//   registry: ExtLocalDeploymentRegistry
// }

// export type Listen<Payload = any> = (_: PortListener<Payload>) => Unlisten
// export type PortListener<Payload = any> = (shell: PortShell<Payload>) => void
// export type Unlisten = () => void
// export type PushMessage = <Ext extends ExtDef = ExtDef>(
//   extId: ExtId<Ext>,
// ) => <Path extends PortPaths<Ext>>(
//   path: Path,
// ) => (payload: PortPathPayload<Ext, Path>) => Message<PortPathPayload<Ext, Path>>
