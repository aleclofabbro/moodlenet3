import { MsgID } from '.'
import { ExtensionDef } from '../extension'
import { assertRegisteredExtension, getRegisteredExtension } from '../extension-registry/lib'
import { extEnv } from '../kernel'
import { FullPortAddress, PortAddress } from '../port-address/types'
import { LookupExt, LookupPort, PortListener, PortShell, PushMessage, Session } from '../types'
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
  const targetExt = getRegisteredExtension(target.extName)

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
    if (cwAddress.extId.name === message.target.extName && cwAddress.path === message.target.path) {
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
  cwAddress: FullPortAddress
}): PortShell<P> {
  const ext = assertRegisteredExtension(cwAddress.extId.name)
  const listen = (listener: PortListener) => addListener(cwAddress, listener)
  const push: PushMessage = (extName, path, payload) =>
    pushMessage(
      createMessage({
        payload: payload as any,
        target: { extName, path },
        session: message.session,
        source: cwAddress,
        parentMsgId: message.id,
      }),
    ) as any

  const lookup: LookupExt = <Ext extends ExtensionDef>(extName: Ext['name']) => {
    const regExt = getRegisteredExtension(extName)
    if (!regExt) {
      // throw new Error(`${extName} extensions not available`)
      return undefined
    }
    const port: LookupPort<Ext> = path => payload => push(regExt.id.name, path, payload)
    return regExt.deployment
      ? {
          port,
          active: true,
        }
      : { active: false }
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
const addListener = (cwAddress: FullPortAddress, listener: PortListener) => {
  const listenerRecord: PortListenerRecord = { listener, cwAddress }
  msgListeners = [...msgListeners, listenerRecord]
  // setImmediate(() => (msgListeners = [...msgListeners, listenerRecord]))
  return () => {
    msgListeners = msgListeners.filter(_ => _ !== listenerRecord)
  }
}
type PortListenerRecord = {
  listener: PortListener
  cwAddress: FullPortAddress
}
let msgListeners: PortListenerRecord[] = []

function newId() {
  return Math.random().toString(36).substring(2)
}
// export function createShellMessage<P extends Obj>({ shell, target }: { shell: PortShell; target: PortAddress }) {}
export function createMessage<P extends Obj>({
  payload,
  source,
  target,
  session,
  parentMsgId,
}: {
  session: Session
  payload: P
  source: FullPortAddress
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
