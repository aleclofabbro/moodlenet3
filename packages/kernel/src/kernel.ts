import type { Boot } from '@moodlenet/bare-metal/lib/types'
import { makePkgMng, pkgInfoOf } from './pkg'
import { createLocalExtensionRegistry } from './registry'
import * as K from './shell-lib'
import type {
  ExtensionRegistryRecord,
  ExtId,
  ExtImplExports,
  KernelExt,
  Message,
  MsgID,
  Pointer,
  PortListener,
  PortShell,
  PushMessage,
  ShellExtensionRegistry
} from './types'

// export const kernelExtIdObj: ExtIdOf<KernelExt> = {
//   name: '@moodlenet/kernel',
//   version: '0.0.1',
// } as const

export const kernelExtId: ExtId<KernelExt> = '@moodlenet/kernel@0.0.1'

export const boot: Boot = async bareMetal => {
  const localExtReg = createLocalExtensionRegistry()

  let msgListeners: PortListenerRecord[] = []
  const kernelExtIdObj = K.splitExtId(kernelExtId)
  const pkgMng = makePkgMng(bareMetal.cwd)
  const cfgPath = process.env.KERNEL_ENV_MOD ?? `${process.cwd()}/kernel-env-mod`
  const global_env: Record<string, any> = require(cfgPath)
  const pkgInfo = pkgInfoOf(module)
  return registerAndStartKernelExt()

  /*
   */
  type PortListenerRecord = {
    listener: PortListener
    cwPointer: Pointer
  }

  function extEnv(extName: string) {
    return global_env[extName]
  }
  async function registerAndStartKernelExt() {
    localExtReg.registerExtension({
      pkgInfo,
      env: extEnv(kernelExtIdObj.extName),
      extId: kernelExtId,
      lifeCycle: {
        start: async ({ mainShell, K }) => {
          K.replyAll<KernelExt>(mainShell, '@moodlenet/kernel@0.0.1', {
            'packages/install':
              _shell =>
              async ({ pkgLoc }) => ({ records: await installPkg({ pkgLoc }) }),
            'extensions/activate':
              _shell =>
              async ({ extName }) => {
                const extRec = await startExtension(extName)
                return {
                  extId: extRec.extId,
                  pkgInfo: extRec.pkgInfo,
                }
              },
            'extensions/deactivate': _shell => async () => {
              throw new Error('unimplemented')
            },
          })

          return async () => {}
        },
      },
    })

    return startExtension(kernelExtIdObj.extName)
  }

  async function installPkg({ pkgLoc }: { pkgLoc: string }) {
    const [info, installResp] = await Promise.all([pkgMng.info(pkgLoc), pkgMng.install(pkgLoc)])
    console.log(info, installResp.all)
    const { extensions, module }: ExtImplExports = bareMetal.modRequire(info.name).default
    const pkgInfo = pkgInfoOf(module)

    return Object.entries(extensions).map(([fullName, impl]) => {
      //FIXME: check fullName format to be ExtId
      const extId = fullName as ExtId
      const { extName } = K.splitExtId(extId)
      const env = extEnv(extName)
      return localExtReg.registerExtension({
        env,
        extId,
        lifeCycle: impl,
        pkgInfo,
      })
    })
  }

  async function startExtension(extIdName: string) {
    const extRecord = localExtReg.getRegisteredExtension(extIdName)
    if (!extRecord) {
      throw new Error(`Extension [${extIdName}] not installed`)
    }
    if (extRecord.deployment) {
      throw new Error(`extension [${extIdName}] already deployed`)
    }

    console.log(`** KERNEL: starting ${extRecord.extId}@${extRecord.extId}`)
    extRecord.deployment = 'deploying'
    const shell = makeStartShell(extRecord)
    const env = extEnv(extIdName)
    const stop = await extRecord.lifeCycle.start({ mainShell: shell, env, K })
    extRecord.deployment = {
      at: new Date(),
      stop,
    }

    pushMessage(
      createMessage({
        payload: null, // FIXME: Activated Message with valued payload?
        source: K.joinPointer(extRecord.extId, ''),
        target: K.joinPointer(kernelExtId, 'extensions.activated'),
        parentMsgId: null,
      }),
    )
    return extRecord
  }

  function makeStartShell(extRec: ExtensionRegistryRecord) {
    const cwPointer = K.joinPointer(extRec.extId, '')
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
      const listenerExt = localExtReg.getRegisteredExtension(listenerP.extName)
      if (!listenerExt?.deployment) {
        //TODO: WARN? useless check ? remove listener ?
        return
      }
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
    assertDeployed()
    const listen = (listener: PortListener) => {
      assertDeployed()
      return addListener({ cwPointer, listener })
    }

    const push: PushMessage = targetExtId => path => payload => {
      assertDeployed()
      const target = K.joinPointer(targetExtId, path)
      localExtReg.assertCompatibleRegisteredExtension(targetExtId)
      return pushMessage(
        createMessage({
          payload,
          target,
          source: cwPointer,
          parentMsgId: message.id,
        }),
      ) as any
    }

    const extRec = localExtReg.assertCompatibleRegisteredExtension(cwExt.extId)
    return {
      message,
      cwPointer,
      pkgInfo: extRec.pkgInfo,
      listen,
      push,
      registry: getShellExtReg(),
    }

    function assertDeployed() {
      localExtReg.assertCompatibleRegisteredExtension(cwExt.extId)
      // FIXME: remove all listeners on exception ?
    }
  }
  function getShellExtReg(): ShellExtensionRegistry {
    const registry: any = { ...localExtReg }
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
