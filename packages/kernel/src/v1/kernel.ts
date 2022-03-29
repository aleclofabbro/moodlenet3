import type { Boot } from '@moodlenet/bare-metal/lib/types'
import { createLocalExtensionRegistry, ExtensionRegistryRecord } from './extension-registry/lib'
import type { ExtCacheOf, ExtensionDef, ExtIdOf, ExtImplExports, ExtName, ExtNameOf } from './extension/types'
import { useExtension } from './lib/flow'
import { RpcPort, rpcReplyAll, rpcRequest } from './lib/port'
import { createMessage, makeShell, pushMessage } from './message'
import { pkgInfoOf } from './pkg-info'
import { makePkgMng } from './pkg-mng'
import { FullPortAddress, PortAddress } from './port-address/types'

// const coreExtensions = (process.env.MOODLENET_CORE_EXTENSIONS ?? '')
//   .split('\n')
//   .map(_ => _.trim())
//   .filter(Boolean)
//   .map(corePkg => corePkg.split('#') as [pkgLoc: string, extIdName: string])

// type KernelEnv = {
//   coreExts: string[]
//   activateExts: string[]
// }
export const kernelExtId: ExtIdOf<KernelExt> = {
  name: '@moodlenet/kernel',
  version: '1.0.0',
} as const

export type KernelExtCache = { x: number }
export type KernelExtPorts = {
  packages: {
    install: RpcPort<(_: { pkgLoc: string }) => Promise<{ records: ExtensionRegistryRecord[] }>>
  }
  extensions: {
    activate: RpcPort<(_: { extName: ExtName }) => Promise<void>>
  }
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
  const cfgPath = process.env.KERNEL_ENV_MOD ?? `${process.cwd()}/kernel-env-mod`
  const global_env: Record<string, any> = require(cfgPath)

  const extEnv = (extName: string) => global_env[extName]
  const localExtReg = createLocalExtensionRegistry()
  async function installPkg({ pkgLoc }: { pkgLoc: string }) {
    const [info, installResp] = await Promise.all([pkgMng.info(pkgLoc), pkgMng.install(pkgLoc)])
    console.log(info, installResp.all)
    const { extensions, module }: ExtImplExports = bareMetal.modRequire(info.name).default
    const pkgInfo = pkgInfoOf(module)

    return Object.entries(extensions).map(([fullName, impl]) => {
      const atIndex = fullName.lastIndexOf('@')
      const name = fullName.substring(0, atIndex)
      const version = fullName.substring(atIndex + 1)
      const id = {
        name,
        version,
      }
      const env = extEnv(name)
      return localExtReg.registerExtension({
        env,
        id,
        lifeCycle: impl,
        pkgInfo,
      })
    })
  }
  const pkgInfo = pkgInfoOf(module)
  const _kernelExtRec = localExtReg.registerExtension({
    pkgInfo,
    env: extEnv(kernelExtId.name),
    id: kernelExtId,
    lifeCycle: {
      start: async ({ shell }) => {
        useExtension<KernelModuleCache>(shell, 'kernel.module-cache', async ({ active }) => {
          if (!active) {
            // TODO: Throw ?
            return
          }
          /* const cache = */ await rpcRequest<KernelModuleCache>(shell)('kernel.module-cache::get')<KernelExt>(
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
        //
        //
        // useExtension<any>(shell, '@moodlenet/test-extension', async () => {
        //   console.log(
        //     await rpcRequest<any>(makeStartShell(_kernelExtRec))('@moodlenet/test-extension::_test')({ x: 2 }),
        //   )
        // })

        rpcReplyAll<KernelExt>(shell, '@moodlenet/kernel', {
          'packages.install':
            _shell =>
            async ({ pkgLoc }) => ({ records: await installPkg({ pkgLoc }) }),
          'extensions.activate':
            _shell =>
            async ({ extName }) => {
              await startExtension(extName)
            },
        })

        // await startCoreExtensions()

        return async () => {}
      },
    },
  })
  await startExtension(kernelExtId.name)

  // const kernelEnv: KernelEnv = {
  //   coreExts: [],
  //   activateExts: [],
  //   ...extEnv(kernelExtId.name),
  // }
  // console.log({ kernelEnv })
  //
  //
  //
  //
  // const result = await installPkg({ pkgLoc: 'file:/home/alec/MOODLENET/repo/moodlenet3/packages/test-extension' })
  // console.log({ result })
  // await Promise.all(result.map(_ => startExtension(_.id.name)))
  //
  //
  //
  //
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
    const shell = makeStartShell(extRecord)
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

  function makeStartShell(extRec: ExtensionRegistryRecord) {
    const startExtAddress: PortAddress = {
      extName: extRec.id.name,
      path: '',
    }
    const cwAddress: FullPortAddress = {
      extId: extRec.id,
      path: '',
    }
    const startMessage = createMessage({
      payload: {},
      source: { extId: kernelExtId, path: '' },
      target: startExtAddress,
      parentMsgId: null,
    })
    const startShell = makeShell({ message: startMessage, cwAddress, extReg: localExtReg, useSafeExtRecord: extRec })
    return startShell
  }
}
