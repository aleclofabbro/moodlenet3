import { Pointer } from '../extension'

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
