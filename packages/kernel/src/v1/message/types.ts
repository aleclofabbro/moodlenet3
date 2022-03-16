import { FullPortAddress, PortAddress } from '../port-address/types'
import { Session } from '../types'

export type MsgID = string
export type Obj = Record<string, any>
export type Message<Payload extends Obj = Obj> = {
  id: MsgID
  target: PortAddress
  source: FullPortAddress
  session: Session
  payload: Payload
  ctx: Record<string, any>
  parentMsgId: MsgID | null
}
