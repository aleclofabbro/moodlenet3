import type { Boot } from '@moodlenet/bare-metal/lib/types'
import type { ExtensionRegistryRecord } from './extension-registry/lib'
import { createLocalExtensionRegistry } from './extension-registry/lib'
import { baseSplitPointer, joinPointer, splitExtId, splitPointer } from './extension/pointer-lib'
import type { ExtensionDef, ExtId, ExtIdOf, ExtImplExports, ExtName, Pointer } from './extension/types'
import type { RpcTopo } from './lib/port'
import { replyAll } from './lib/port'
import type { Message, MsgID } from './message'
import type { PkgInfo } from './pkg-info'
import { pkgInfoOf } from './pkg-info'
import { makePkgMng } from './pkg-mng'
import type { PortListener, PortShell, PushMessage, ShellExtensionRegistry } from './types'

export const kernelExtIdObj: ExtIdOf<KernelExt> = {
  name: '@moodlenet/kernel',
  version: '1.0.0',
} as const

export const kernelExtId: ExtId<KernelExt> = '@moodlenet/kernel@1.0.0'

export type KernelExtPorts = {
  packages: {
    install: RpcTopo<(_: { pkgLoc: string }) => Promise<{ records: ExtensionRegistryRecord[] }>>
  }
  extensions: {
    activate: RpcTopo<
      (_: { extName: ExtName }) => Promise<{
        extId: ExtId
        pkgInfo: PkgInfo
      }>
    >
    deactivate: RpcTopo<
      (_: { extName: ExtName }) => Promise<{
        extId: ExtId
        pkgInfo: PkgInfo
      }>
    >
  }
}
export type KernelExt = ExtensionDef<'@moodlenet/kernel', '1.0.0', KernelExtPorts>

export const boot: Boot = async bareMetal => {
  let msgListeners: PortListenerRecord[] = []
  const pkgMng = makePkgMng(bareMetal.cwd)
  const cfgPath = process.env.KERNEL_ENV_MOD ?? `${process.cwd()}/kernel-env-mod`
  const global_env: Record<string, any> = require(cfgPath)
  const extEnv = (extName: string) => global_env[extName]
  const localExtReg = createLocalExtensionRegistry()
  const pkgInfo = pkgInfoOf(module)

  /* const _kernelExtRec =  */
  localExtReg.registerExtension({
    pkgInfo,
    env: extEnv(kernelExtIdObj.name),
    extId: kernelExtId,
    lifeCycle: {
      start: async ({ shell }) => {
        replyAll<KernelExt>(shell, '@moodlenet/kernel@1.0.0', {
          'packages.install':
            _shell =>
            async ({ pkgLoc }) => ({ records: await installPkg({ pkgLoc }) }),
          'extensions.activate':
            _shell =>
            async ({ extName }) => {
              const extRec = await startExtension(extName)
              return {
                extId: extRec.extId,
                pkgInfo: extRec.pkgInfo,
              }
            },
          'extensions.deactivate': _shell => async () => {
            throw new Error('unimplemented')
          },
        })

        return async () => {}
      },
    },
  })
  await startExtension(kernelExtIdObj.name)

  return void 0

  /*
   */
  async function installPkg({ pkgLoc }: { pkgLoc: string }) {
    const [info, installResp] = await Promise.all([pkgMng.info(pkgLoc), pkgMng.install(pkgLoc)])
    console.log(info, installResp.all)
    const { extensions, module }: ExtImplExports = bareMetal.modRequire(info.name).default
    const pkgInfo = pkgInfoOf(module)

    return Object.entries(extensions).map(([fullName, impl]) => {
      //FIXME: check fullName format to be ExtId
      const extId = fullName as ExtId
      const { extName } = splitExtId(extId)
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
    const stop = await extRecord.lifeCycle.start({ shell, env })
    extRecord.deployment = {
      at: new Date(),
      stop,
    }

    pushMessage(
      createMessage({
        payload: null, // FIXME: Activated Message with valued payload?
        source: joinPointer(extRecord.extId, ''),
        target: joinPointer(kernelExtId, 'extensions.activated'),
        parentMsgId: null,
      }),
    )
    return extRecord
  }

  function makeStartShell(extRec: ExtensionRegistryRecord) {
    const cwPointer = joinPointer(extRec.extId, '')
    const message = createMessage({
      payload: null, // FIXME: startShell Message with valued payload?
      source: joinPointer(kernelExtId, ''),
      target: cwPointer,
      parentMsgId: null,
    })
    const startShell = makeShell({
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
      const listenerP = splitPointer(cwPointer)
      const listenerExt = localExtReg.getRegisteredExtension(listenerP.extName)
      if (!listenerExt?.deployment) {
        //TODO: WARN? useless check ? remove listener ?
        return
      }
      const shell = makeShell({
        cwPointer,
        message,
      })
      listener(shell)
    })

    return message
  }
  function makeShell<P>({ message, cwPointer }: { message: Message<P>; cwPointer: Pointer }): PortShell<P> {
    const cwExt = baseSplitPointer(cwPointer)
    assertDeployed()
    const listen = (listener: PortListener) => {
      assertDeployed()
      return addListener({ cwPointer, listener })
    }

    const push: PushMessage = targetExtId => path => payload => {
      assertDeployed()
      const target = joinPointer(targetExtId, path)
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
      listen,
      cwPointer,
      push,
      registry: getShellExtReg(),
      pkgInfo: extRec.pkgInfo,
    }
    function assertDeployed() {
      localExtReg.assertCompatibleRegisteredExtension(cwExt.extId)
      // FIXME: remove all listeners on exception ?
    }
    function getShellExtReg(): ShellExtensionRegistry {
      const registry: any = { ...localExtReg }
      //@ts-ignore
      delete registry.registerExtension
      //@ts-ignore
      delete registry.unregisterExtension
      return registry
    }
  }
  function addListener({ cwPointer, listener }: { listener: PortListener; cwPointer: Pointer }) {
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
