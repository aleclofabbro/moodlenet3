import { MsgID } from '.'
import { ExtensionDef } from '../extension'
import { ExtensionRegistry } from '../extension-registry'
import { FullPortAddress, PortAddress } from '../port-address/types'
import { LookupExt, PortListener, PortShell, PushMessage } from '../types'
import { Message, Obj } from './types'

export const pushMessage = <P extends Obj>(message: Message<P>, extReg: ExtensionRegistry) => {
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
  const sourceExt = extReg.getRegisteredExtension(source.extId.name)
  const targetExt = extReg.getRegisteredExtension(target.extName)

  if (!(targetExt && sourceExt)) {
    throw new Error(`source or target extensions not available`)
  }

  msgListeners.forEach(({ listener, cwAddress }) => {
    const listenerExt = extReg.getRegisteredExtension(cwAddress.extId.name)
    if (!listenerExt?.deployment) {
      //TODO: WARN
      return
    }
    const shell = makeShell({
      cwAddress,
      message,
      extReg,
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
  extReg,
}: {
  message: Message<P>
  cwAddress: FullPortAddress
  extReg: ExtensionRegistry
}): PortShell<P> {
  const extRecord = extReg.getRegisteredExtension(cwAddress.extId.name)
  if (!extRecord?.deployment) {
    throw new Error(`extension ${cwAddress.extId.name} not available atm`)
  }
  const listen = (listener: PortListener) => addListener(cwAddress, listener)
  const push: PushMessage = (extName, path, payload) =>
    pushMessage(
      createMessage({
        payload: payload as any,
        target: { extName, path },
        source: cwAddress,
        parentMsgId: message.id,
      }),
      extReg,
    ) as any

  const lookup: LookupExt = <Ext extends ExtensionDef>(extName: Ext['name']) => {
    const extRecord = extReg.getRegisteredExtension(extName)
    if (!extRecord) {
      // throw new Error(`${extName} extensions not available`)
      return undefined
    }
    return {
      active: !!extRecord.deployment,
      extId: extRecord.id,
      pkgInfo: extRecord.pkgInfo,
    }
  }
  const env = extRecord.env

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
  parentMsgId,
}: {
  payload: P
  source: FullPortAddress
  target: PortAddress
  parentMsgId: MsgID | null
}): Message<P> {
  return {
    id: newId(),
    ctx: {},
    payload,
    source,
    target,
    parentMsgId,
  }
}
