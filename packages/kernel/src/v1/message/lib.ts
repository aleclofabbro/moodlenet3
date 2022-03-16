import { MsgID } from '.'
import { assertRegisteredExtension, getRegisteredExtension } from '../extension-registry/lib'
import { extEnv } from '../kernel'
import { PortAddress } from '../port-address/types'
import { LookupExt, PortListener, PortShell, PushMessage, Session } from '../types'
import { Message, Obj } from './types'

export const pushMessage = <P extends Obj>(message: Message<P>) => {
  console.log(
    `
+++++++++++++++++++++++
pushMessage`,
    message,
    `
-----------------------
`,
  )
  const { target, source } = message
  const sourceExt = getRegisteredExtension(source.extId.name)
  const targetExt = getRegisteredExtension(target.extId.name)

  if (!(targetExt && sourceExt)) {
    throw new Error(`source or target extensions not available`)
  }

  msgListeners.forEach(({ listener, cwAddress }) => {
    const listenerExt = getRegisteredExtension(cwAddress.extId.name)
    if (!listenerExt?.deployment) {
      //TODO: WARN
      return
    }
    const shell = makeShell({
      cwAddress,
      message,
    })
    if (cwAddress.extId.name === message.target.extId.name && cwAddress.path === message.target.path) {
      setImmediate(() => listener(shell))
    } else {
      listener(shell)
    }
  })

  return message
}
export function makeShell<P extends Obj = Obj>({
  message,
  cwAddress,
}: {
  message: Message<P>
  cwAddress: PortAddress
}): PortShell<P> {
  const ext = assertRegisteredExtension(cwAddress.extId.name)
  const listen = (listener: PortListener) => addListener(cwAddress, listener)
  const push: PushMessage = (target, payload) =>
    pushMessage(
      createMessage({
        payload,
        target,
        session: message.session,
        source: cwAddress,
        parentMsgId: message.id,
      }),
    )

  const lookup: LookupExt = extName => {
    const regExt = getRegisteredExtension(extName)
    if (!regExt?.deployment) {
      throw new Error(`${extName} extensions not available`)
    }
    return path => payload => push({ extId: regExt.id, path }, payload)
  }
  const env = extEnv(ext.id.name)

  return {
    env,
    lookup,
    message,
    listen,
    cwAddress,
    push,
  }
}
const addListener = (cwAddress: PortAddress, listener: PortListener) => {
  const listenerRecord: PortListenerRecord = { listener, cwAddress }
  msgListeners = [...msgListeners, listenerRecord]
  // setImmediate(() => (msgListeners = [...msgListeners, listenerRecord]))
  return () => {
    msgListeners = msgListeners.filter(_ => _ !== listenerRecord)
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
  parentMsgId,
}: {
  session: Session
  payload: P
  source: PortAddress
  target: PortAddress
  parentMsgId: MsgID | null
}): Message<P> {
  return {
    id: newId(),
    ctx: {},
    payload,
    session,
    source,
    target,
    parentMsgId,
  }
}
