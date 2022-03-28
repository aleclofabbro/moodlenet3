import type { Boot } from '@moodlenet/bare-metal/lib/types'
import { createLocalExtensionRegistry } from './extension-registry/lib'
import { Extension } from './extension/extension'
import type { ExtCacheOf, ExtensionDef, ExtensionId, ExtIdOf, ExtNameOf } from './extension/types'
import { useExtension } from './lib/flow'
import { RpcPort, rpcReply, rpcReplyAll, rpcRequest } from './lib/port'
import { createMessage, makeShell, pushMessage } from './message'
import { makePkgMng } from './pkg-mng'
import { FullPortAddress, PortAddress } from './port-address/types'

// const coreExtensions = (process.env.MOODLENET_CORE_EXTENSIONS ?? '')
//   .split('\n')
//   .map(_ => _.trim())
//   .filter(Boolean)
//   .map(corePkg => corePkg.split('#') as [pkgLoc: string, extIdName: string])

type KernelEnv = {
  coreExts: string[]
  activateExts: string[]
}
export const kernelExtId: ExtIdOf<KernelExt> = {
  name: '@moodlenet/kernel',
  version: '1.0.0',
} as const

export type KernelExtCache = { x: number }
export type KernelExtPorts = {
  extensions: {
    installAndActivate: RpcPort<(_: { pkgLoc?: string; extId: ExtensionId }) => Promise<number>> // returning a number for testing race condition !
  }
  ___CONTROL_PORT_REMOVE_ME_LATER___: RpcPort<<T>(_: { _: T }) => Promise<T>>
}
export type KernelExt = ExtensionDef<'@moodlenet/kernel', '1.0.0', KernelExtPorts, KernelExtCache>

export type KernelModuleCache = ExtensionDef<
  'kernel.module-cache',
  '1.0.0',
  {
    get: RpcPort<<Ext extends ExtensionDef>(extName: ExtNameOf<Ext>) => Promise<undefined | ExtCacheOf<Ext>>>
    set: RpcPort<
      <Ext extends ExtensionDef>(extName: ExtNameOf<Ext>, cache: ExtCacheOf<Ext>) => Promise<ExtCacheOf<Ext>>
    >
  }
>
export const boot: Boot = async bareMetal => {
  const pkgMng = makePkgMng(bareMetal.cwd)
  const cfgPath = process.env.MN_EXT_ENV ?? `${process.cwd()}/mn-kernel-config`
  const global_env: Record<string, any> = require(cfgPath)

  const extEnv = (extName: string) => global_env[extName]
  const localExtReg = createLocalExtensionRegistry()

  Extension<KernelExt>(module, kernelExtId, {
    async start({ shell }) {
      useExtension<KernelModuleCache>(shell, 'kernel.module-cache', async ({ active }) => {
        if (!active) {
          // TODO: Throw ?
          return
        }
        const cache = await rpcRequest<KernelModuleCache>(shell)('kernel.module-cache::get')<KernelExt>(
          '@moodlenet/kernel',
        )
      })
      // useExtension<WebappExt>(shell, '@moodlenet/webapp', () => {
      //   request<WebappExt>(shell)('@moodlenet/webapp::ensureExtension')({
      //     extId: kernelExtId,
      //     moduleLoc: resolve(__dirname, '..', '..'),
      //     cmpPath: 'lib/v1/webapp',
      //   })

      //   request<WebappExt>(shell)('@moodlenet/webapp::___CONTROL_PORT_REMOVE_ME_LATER___')('2').then(_ => _)
      // })

      rpcReplyAll<KernelExt>(shell, '@moodlenet/kernel', {
        'extensions.installAndActivate':
          _shell =>
          async ({ extId, pkgLoc = `${extId.name}@${extId.version}` }) => {
            const installResp = await pkgMng.install([pkgLoc])
            console.log(installResp.all)
            bareMetal.modRequire(extId.name)
            startExtension(extId.name)
            return 1
          },
        '___CONTROL_PORT_REMOVE_ME_LATER___':
          _shell =>
          async ({ _ }) =>
            _,
      })

      rpcReply<KernelExt>(shell)('@moodlenet/kernel::extensions.installAndActivate')(_s => async _a => {
        // Race condition replying this port ! ^^' :)
        // TODO: BTW remove me ^^'
        return 2
      })
      // await startCoreExtensions()

      return async () => {}
    },
  })

  const kernelEnv: KernelEnv = {
    coreExts: [],
    activateExts: [],
    ...extEnv(kernelExtId.name),
  }
  console.log({ kernelEnv })

  // async function startCoreExtensions() {
  //   return Promise.all(
  //     coreExtensions.map(async ([pkgLoc, extIdName]) => {
  //       console.log(`** KERNEL: installing ${extIdName} from ${pkgLoc}`)
  //       await pkgMng.install([pkgLoc])
  //       bareMetal.modRequire(extIdName)
  //       const extReg = await startExtension(extIdName)
  //       return extReg
  //     }),
  //   )
  // }

  async function startExtension(extIdName: string) {
    const extRecord = localExtReg.getRegisteredExtension(extIdName)
    if (!extRecord) {
      throw new Error(`Extension [${extIdName}] not installed`)
    }
    if (extRecord.deployment) {
      throw new Error(`extension [${extIdName}] already deployed`)
    }

    console.log(`** KERNEL: starting ${extRecord.id.name}@${extRecord.id.version}`)
    const shell = makeStartShell(extRecord.id)
    extRecord.deployment = 'deploying'
    const stop = await extRecord.lifeCycle.start({ shell })
    extRecord.deployment = {
      at: new Date(),
      stop,
    }
    pushMessage(
      createMessage({
        payload: {},
        source: { extId: extRecord.id, path: 'activated' },
        target: { extName: kernelExtId.name, path: 'extensions.activated' },
        parentMsgId: null,
      }),
      localExtReg,
    )
    return extRecord
  }

  function makeStartShell(extId: ExtensionId) {
    const startExtAddress: PortAddress = {
      extName: extId.name,
      path: '',
    }
    const cwAddress: FullPortAddress = {
      extId,
      path: '',
    }
    const startMessage = createMessage({
      payload: {},
      source: { extId: kernelExtId, path: '' },
      target: startExtAddress,
      parentMsgId: null,
    })
    const startShell = makeShell({ message: startMessage, cwAddress, extReg: localExtReg })
    return startShell
  }

  startExtension(kernelExtId.name)
}
