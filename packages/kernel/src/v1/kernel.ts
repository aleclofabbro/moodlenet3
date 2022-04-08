import type { Boot } from '@moodlenet/bare-metal/lib/types'
import { createLocalExtensionRegistry, ExtensionRegistryRecord } from './extension-registry/lib'
import { ExtensionDef, ExtId, ExtIdOf, ExtImplExports, ExtName, joinPointer, splitExtId } from './extension/types'
import { replyAll, RpcTopo } from './lib/port'
import { createMessage, makeShell } from './message'
import { PkgInfo, pkgInfoOf } from './pkg-info'
import { makePkgMng } from './pkg-mng'

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
  const pkgInfo = pkgInfoOf(module)
  /* const _kernelExtRec =  */ localExtReg.registerExtension({
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

    // pushMessage(
    //   createMessage({
    //     payload: null, // FIXME: Activated Message with valued payload?
    //     source: joinPointer(extRecord.extId, ''),
    //     target: joinPointer(kernelExtId, 'extensions.activated'),
    //     parentMsgId: null,
    //   }),
    //   localExtReg,
    // )
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
      extReg: localExtReg,
    })
    return startShell
  }
}
