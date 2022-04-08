import { ExtId, Pointer } from '../extension'

export type MsgID = string
export type Message<Payload> = {
  id: MsgID
  target: Pointer
  source: Pointer
  payload: Payload
  parentMsgId: MsgID | null
  ctx: Record<string, any>
  managedBy?: {
    extId: ExtId
    pkgId: { name: string; version: string }
  }
}
