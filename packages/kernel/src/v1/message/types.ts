import { Gate } from '../extension/types'
import { PortAddress } from '../port-address/types'
import { Obj, Session } from '../types'

export type GetMsg = <P extends Obj>(gate: Gate<P>) => Message<P> | undefined
export type MsgID = string
export type Message<Payload extends Obj = Obj> = {
  id: MsgID
  target: PortAddress
  source: PortAddress
  session: Session
  payload: Payload
  ctx: Obj
}
