import type { BareMetalHandle } from '@moodlenet/bare-metal/lib/types'
import * as K from './k'
import { createLocalDeploymentRegistry } from './registry'
import type {
  Ext,
  ExtDef,
  ExtDeployment,
  ExtId,
  ExtLocalDeploymentRegistry,
  KernelExt,
  Message,
  MsgID,
  PkgInfo,
  Pointer,
  PortListener,
  PortShell,
  PushMessage,
} from './types'
export const MN_K_PKG_INFO: PkgInfo = { name: '@moodlenet/kernel', version: '0.0.1' }

export const kernelExtId: ExtId<KernelExt> = 'kernel.core@0.0.1'
export const create = (bareMetal: BareMetalHandle) => {
  let msgListeners: PortListenerRecord[] = []
  const localDeplReg = createLocalDeploymentRegistry()
  const cfgPath = process.env.KERNEL_ENV_MOD ?? `${process.cwd()}/kernel-env-mod`
  const global_env: Record<string, any> = require(cfgPath)
  const kernelExt: Ext<KernelExt> = {
    id: kernelExtId,
    name: 'K',
    description: 'K',
    requires: [],
    start: ({ mainShell, K }) => {
      K.retrnAll<KernelExt>(mainShell, kernelExtId, {
        'extension/start':
          _shell =>
          ({ ext, pkgInfo }) =>
            startExtension(ext, pkgInfo),
        'extension/stop':
          _shell =>
          ({ extId }) =>
            stopExtension(extId),
      })

      return
    },
  }
  return startExtension(kernelExt, MN_K_PKG_INFO)

  /*
   */
  type PortListenerRecord = {
    listener: PortListener
    cwPointer: Pointer
  }

  function extEnv(extName: string) {
    return global_env[extName]
  }

  function stopExtension<Def extends ExtDef = ExtDef>(extId: ExtId<Def>) {
    const deplRes = localDeplReg.undeploying(extId)
    return deplRes
  }
  function startExtension<Def extends ExtDef = ExtDef>(ext: Ext<Def>, pkgInfo: PkgInfo) {
    const deplRes = localDeplReg.deploying(ext, pkgInfo)

    if (!deplRes.done) {
      return deplRes
    }

    console.log(`** KERNEL: starting ${ext.id}`)
    const shell = makeStartShell(deplRes.deployment)
    const env = extEnv(ext.id)
    ext.start({ mainShell: shell, env, K })

    pushMessage(
      createMessage({
        payload: null, // FIXME: Activated Message with valued payload?
        source: K.joinPointer(ext.id, ''),
        target: K.joinPointer(kernelExtId, 'extensions.deploying'),
        parentMsgId: null,
      }),
    )
    return deplRes
  }

  function makeStartShell(extDepl: ExtDeployment) {
    const cwPointer = K.joinPointer(extDepl.ext.id, '')
    const message = createMessage({
      payload: null, // FIXME: startShell Message with valued payload?
      source: K.joinPointer(kernelExtId, ''),
      target: cwPointer,
      parentMsgId: null,
    })
    const startShell = makePortShell({
      message,
      cwPointer,
    })
    return startShell
  }

  function pushMessage<P>(message: Message<P>) {
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
      const listenerP = K.splitPointer(cwPointer)
      localDeplReg.assertDeployed(listenerP.extId)
      const shell = makePortShell({
        cwPointer,
        message,
      })
      listener(shell)
    })

    return message
  }

  function makePortShell<P>({ message, cwPointer }: { message: Message<P>; cwPointer: Pointer }): PortShell<P> {
    const cwExt = K.baseSplitPointer(cwPointer)
    assertMeDeployed()
    const listen = (listener: PortListener) => {
      assertMeDeployed()
      return addListener({ cwPointer, listener })
    }

    const push: PushMessage = targetExtId => path => payload => {
      assertMeDeployed()
      const target = K.joinPointer(targetExtId, path)
      localDeplReg.assertDeployed(targetExtId)
      return pushMessage(
        createMessage({
          payload,
          target,
          source: cwPointer,
          parentMsgId: message.id,
        }),
      ) as any
    }

    const { pkgInfo } = assertMeDeployed()
    return {
      message,
      cwPointer,
      pkgInfo,
      listen,
      push,
      registry: getShellExtReg(),
    }

    function assertMeDeployed() {
      return localDeplReg.assertDeployed(cwExt.extId)
      // FIXME: remove all listeners on exception ?
    }
  }
  function getShellExtReg(): ExtLocalDeploymentRegistry {
    const registry: any = { ...localDeplReg }
    //@ts-ignore
    delete registry.registerExtension
    //@ts-ignore
    delete registry.unregisterExtension
    return registry
  }

  function addListener({ cwPointer, listener }: { listener: PortListener; cwPointer: Pointer }) {
    const listenerRecord: PortListenerRecord = { listener, cwPointer }
    msgListeners = [...msgListeners, listenerRecord]
    // setImmediate(() => (msgListeners = [...msgListeners, listenerRecord]))
    return () => {
      msgListeners = msgListeners.filter(_ => _ !== listenerRecord)
    }
  }

  function createMessage<P>({
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
      id: newMsgId(),
      ctx: {},
      payload,
      source,
      target,
      parentMsgId,
    }
  }

  function newMsgId() {
    return Math.random().toString(36).substring(2)
  }
}
