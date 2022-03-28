import type { Boot } from '@moodlenet/pkg-mng/lib/v1/types'
import type { WebappExt } from '@moodlenet/webapp/lib'
import { createRequire } from 'module'
import { resolve } from 'path'
import { createLocalExtensionRegistry } from './extension-registry/lib'
import { Extension } from './extension/extension'
import type { ExtensionDef, ExtensionId, ExtIdOf } from './extension/types'
import { useExtension } from './lib/flow'
import { AsyncPort, reply, replyAll, request } from './lib/port'
import { createMessage, makeShell, pushMessage } from './message'
import { FullPortAddress, PortAddress } from './port-address/types'

const cfgPath = process.env.MN_EXT_ENV ?? `${process.cwd()}/mn-kernel-config`
const coreExtensions = (process.env.MOODLENET_CORE_EXTENSIONS ?? '')
  .split('\n')
  .map(_ => _.trim())
  .filter(Boolean)
  .map(corePkg => corePkg.split('#') as [pkgLoc: string, extIdName: string])
// delete process.env.MN_EXT_ENV
let globalEnv: any = {}
try {
  globalEnv = require(cfgPath)
} catch (e) {
  console.warn(`couldn't require config:${cfgPath}, setting to {}`)
  console.warn(e)
}
export const extEnv = (extName: string) => globalEnv[extName]

type KernelEnv = {
  coreExts: string[]
  activateExts: string[]
}
export const kernelExtId: ExtIdOf<KernelExt> = {
  name: '@moodlenet/kernel',
  version: '1.0.0',
} as const

export type KernelExt = ExtensionDef<
  '@moodlenet/kernel',
  '1.0.0',
  {
    extensions: {
      installAndActivate: AsyncPort<(_: { pkgLoc?: string; extId: ExtensionId }) => Promise<number>> // returning a number for testing race condition !
    }
    ___CONTROL_PORT_REMOVE_ME_LATER___: AsyncPort<<T>(_: T) => Promise<{ _: T }>>
  }
>

// export type ModuleCache = {
//   get<Ext extends ExtensionDef>(extName: ExtNameOf<Ext>): Promise<ExtCacheOf<Ext>>
//   set<Ext extends ExtensionDef>(extName: ExtNameOf<Ext>, cache: ExtCacheOf<Ext>): Promise<ExtCacheOf<Ext>>
// }
// export type Cfg = {
//   moduleCache: ModuleCache
// }
export const boot: Boot = async pkgMng => {
  const localExtReg = createLocalExtensionRegistry()
  const extRequire = createRequire(pkgMng?.nodeModulesDir ?? process.cwd())

  Extension<KernelExt>(module, kernelExtId, {
    async start({ shell }) {
      useExtension<WebappExt>(shell, '@moodlenet/webapp', () => {
        request<WebappExt>(shell)('@moodlenet/webapp::ensureExtension')({
          extId: kernelExtId,
          moduleLoc: resolve(__dirname, '..', '..'),
          cmpPath: 'lib/v1/webapp',
        })

        request<WebappExt>(shell)('@moodlenet/webapp::___CONTROL_PORT_REMOVE_ME_LATER___')('2').then(_ => _)
      })

      replyAll<KernelExt>(shell, '@moodlenet/kernel', {
        'extensions.installAndActivate':
          _shell =>
          async ({ extId, pkgLoc = `${extId.name}@${extId.version}` }) => {
            const installResp = await pkgMng.install([pkgLoc])
            console.log(installResp.all)
            extRequire(extId.name)
            startExtension(extId.name)
            return 1
          },
        '___CONTROL_PORT_REMOVE_ME_LATER___': _shell => async _ => ({ _ }),
      })

      reply<KernelExt>(shell)('@moodlenet/kernel::extensions.installAndActivate')(_s => async _a => {
        // Race condition replying this port ! ^^' :)
        // TODO: BTW remove me ^^'
        return 2
      })
      await startCoreExtensions()

      return async () => {}
    },
  })

  const kernelEnv: KernelEnv = {
    coreExts: [],
    activateExts: [],
    ...extEnv(kernelExtId.name),
  }
  console.log({ kernelEnv })

  async function startCoreExtensions() {
    return Promise.all(
      coreExtensions.map(async ([pkgLoc, extIdName]) => {
        console.log(`** KERNEL: installing ${extIdName} from ${pkgLoc}`)
        await pkgMng.install([pkgLoc])
        extRequire(extIdName)
        const extReg = await startExtension(extIdName)
        return extReg
      }),
    )
  }

  async function startExtension(extIdName: string) {
    const extReg = localExtReg.getRegisteredExtension(extIdName)
    if (!extReg) {
      throw new Error(`Extension [${extIdName}] not installed`)
    }
    if (extReg.deployment) {
      throw new Error(`extension [${extIdName}] already deployed`)
    }

    console.log(`** KERNEL: starting ${extReg.id.name}@${extReg.id.version}`)
    const shell = makeStartShell(extReg.id)
    extReg.deployment = 'deploying'
    const stop = await extReg.lifeCycle.start({ shell })
    extReg.deployment = {
      at: new Date(),
      stop,
    }
    pushMessage(
      createMessage({
        payload: {},
        source: { extId: extReg.id, path: 'activated' },
        target: { extName: kernelExtId.name, path: 'extensions.activated' },
        parentMsgId: null,
      }),
    )
    return extReg
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
    const startShell = makeShell({ message: startMessage, cwAddress })
    return startShell
  }

  startExtension(kernelExtId.name)
}
