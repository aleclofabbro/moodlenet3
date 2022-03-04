import {
  assertRegisteredExtension,
  getRegisteredExtension,
  lookupFor,
} from '../extension-registry/lib'
import { Port, PortTopologyNode } from '../extension/types'
import { extEnv } from '../kernel'
import { isMsg } from '../port-address'
import { PortAddress } from '../port-address/types'
import { Obj, PortListener, PortShell, Session } from '../types'
import { GetMsg, Message } from './types'

export const pushMessage = (message: Message) => {
  console.log(`***********pushMessage \n`, message, '\n')
  const { target, source } = message
  const sourceExt = getRegisteredExtension(source.extId.name)
  const targetExt = getRegisteredExtension(target.extId.name)

  if (!(targetExt && sourceExt)) {
    //TODO: WARN
    return
  }

  const targetPortTopoNode: PortTopologyNode | undefined =
    target.path.reduce<any>(
      (portTopoNode, nextProp) => (portTopoNode ?? {})[nextProp],
      targetExt.def.ports
    )
  if ('function' !== typeof targetPortTopoNode) {
    //TODO: WARN or throw ?
    return
  }
  //TODO: after this narrowing targetPortTopoNode gets typed as "never" :\ (same as for portGates)
  msgListeners.forEach(({ listener, cwAddress }) => {
    const listenerExt = getRegisteredExtension(cwAddress.extId.name)
    if (!listenerExt?.active) {
      //TODO: WARN
      return
    }
    const shell = makeShell({
      cwAddress,
      message,
    })
    listener(shell)
  })

  const targetPort: Port<any> = targetPortTopoNode
  const shell = makeShell({ message, cwAddress: target })
  //TODO: WARN NO Guard
  try {
    targetPort.meta?.guard?.(shell)
  } catch (guardError) {
    console.error(`
message guard failed
message #${message.id} 
from ${message.source.extId}#${message.source.path.join('::')}
to ${message.target.extId}#${message.target.path.join('::')}
msg ${String(guardError)}
    `)
    throw guardError
  }
  targetPort(shell)
}
function makeShell<P extends Obj>({
  message,
  cwAddress,
}: {
  message: Message<P>
  cwAddress: PortAddress
}): PortShell<P> {
  const ext = assertRegisteredExtension(cwAddress.extId.name)
  const listen = (listener: PortListener) => addListener(cwAddress, listener)

  const getMsg: GetMsg = (gate) => (isMsg(gate, message) ? message : undefined)
  const lookup = lookupFor(message.session, message.target)
  const env = extEnv(ext.id.name)
  return {
    env,
    lookup,
    message,
    listen,
    isMsg,
    getMsg,
    cwAddress,
  }
}
const addListener = (cwAddress: PortAddress, listener: PortListener) => {
  const listenerRecord: PortListenerRecord = { listener, cwAddress }
  msgListeners = [...msgListeners, listenerRecord]
  // setImmediate(() => (msgListeners = [...msgListeners, listenerRecord]))
  return () => {
    msgListeners = msgListeners.filter((_) => _ !== listenerRecord)
  }
}
type PortListenerRecord = {
  listener: PortListener
  cwAddress: PortAddress
}
let msgListeners: PortListenerRecord[] = []

function newId() {
  return Math.random().toString(36).substring(2)
}
export function createMessage<P extends Obj>({
  payload,
  source,
  target,
  session,
}: {
  session: Session
  payload: P
  source: PortAddress
  target: PortAddress
}): Message<P> {
  return {
    id: newId(),
    ctx: {},
    payload,
    session,
    source,
    target,
  }
}
