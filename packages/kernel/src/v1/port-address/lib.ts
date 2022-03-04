import { IsGateMsg, WithGateMeta } from '../extension/types'
import { Message } from '../message/types'
import { PortAddress } from './types'

export const addressEquals = (a: PortAddress, b: PortAddress) =>
  a.extId.name === b.extId.name && a.path.join(':::') === b.path.join(':::')
export const isMsg: IsGateMsg = <Payload>(
  { meta: { address } }: WithGateMeta,
  msg: Message
): msg is Message<Payload> => addressEquals(address, msg.target)
