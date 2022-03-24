import { FullPortAddress, PortAddress } from '../port-address/types'

export type MsgID = string
export type Obj = Record<string, any>
export type Message<Payload extends Obj = Obj> = {
  id: MsgID
  target: PortAddress
  source: FullPortAddress
  payload: Payload
  ctx: Record<string, any>
  parentMsgId: MsgID | null
}
