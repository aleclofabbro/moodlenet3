import { MsgID } from '.'
import { baseSplitPointer, joinPointer, Pointer, splitPointer } from '../extension'
import { ExtensionRegistry } from '../extension-registry'
import { PortListener, PortShell, PushMessage, ShellExtensionRegistry } from '../types'
import { Message } from './types'

export const pushMessage = <P>(message: Message<P>, extReg: ExtensionRegistry) => {
  console.log(
    `
+++++++++++++++++++++++
pushMessage`,
    message,
    `
-----------------------
`,
  )
  msgListeners.forEach(({ cwPointer, listener }) => {
    const listenerP = splitPointer(cwPointer)
    const listenerExt = extReg.getRegisteredExtension(listenerP.extName)
    if (!listenerExt?.deployment) {
      //TODO: WARN? useless check ? remove listener ?
      return
    }
    const shell = makeShell({
      cwPointer,
      message,
      extReg,
    })
    listener(shell)
  })

  return message
}
export function makeShell<P>({
  message,
  cwPointer,
  extReg,
}: {
  message: Message<P>
  cwPointer: Pointer
  extReg: ExtensionRegistry
}): PortShell<P> {
  const cwExt = baseSplitPointer(cwPointer)
  assertDeployed()
  const listen = (listener: PortListener) => {
    assertDeployed()
    return addListener({ cwPointer, listener })
  }

  const push: PushMessage = targetExtId => path => payload => {
    assertDeployed()
    const target = joinPointer(targetExtId, path)
    extReg.assertCompatibleRegisteredExtension(targetExtId)
    return pushMessage(
      createMessage({
        payload,
        target,
        source: cwPointer,
        parentMsgId: message.id,
      }),
      extReg,
    ) as any
  }

  const extRec = extReg.assertCompatibleRegisteredExtension(cwExt.extId)
  return {
    message,
    listen,
    cwPointer,
    push,
    registry: getShellExtReg(),
    pkgInfo: extRec.pkgInfo,
  }
  function assertDeployed() {
    extReg.assertCompatibleRegisteredExtension(cwExt.extId)
    // FIXME: remove all listeners on exception ?
  }
  function getShellExtReg(): ShellExtensionRegistry {
    const registry: any = { ...extReg }
    //@ts-ignore
    delete registry.registerExtension
    //@ts-ignore
    delete registry.unregisterExtension
    return registry
  }
}
const addListener = ({ cwPointer, listener }: { listener: PortListener; cwPointer: Pointer }) => {
  const listenerRecord: PortListenerRecord = { listener, cwPointer }
  msgListeners = [...msgListeners, listenerRecord]
  // setImmediate(() => (msgListeners = [...msgListeners, listenerRecord]))
  return () => {
    msgListeners = msgListeners.filter(_ => _ !== listenerRecord)
  }
}
type PortListenerRecord = {
  listener: PortListener
  cwPointer: Pointer
}
let msgListeners: PortListenerRecord[] = []

export function createMessage<P>({
  payload,
  source,
  target,
  parentMsgId,
}: {
  payload: P
  source: Pointer
  target: Pointer
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

function newId() {
  return Math.random().toString(36).substring(2)
}
