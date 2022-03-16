import type { Boot } from '@moodlenet/pkg-mng/lib/v1/types'
import { createRequire } from 'module'
import { resolve } from 'path'
import { getRegisteredExtension } from './extension-registry/lib'
import { Extension } from './extension/extension'
import type { ExtensionId } from './extension/types'
import { watchExt } from './lib/flow'
import { createMessage, makeShell, pushMessage } from './message'

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
export const kernelExtId: ExtensionId = {
  name: '@moodlenet/kernel',
  version: '1.0.0',
}
//TODO: returns something to pkgmng ?
export const boot: Boot = async pkgMng => {
  const extRequire = createRequire(pkgMng?.nodeModulesDir ?? process.cwd())
  Extension(module, kernelExtId, {
    async start({ shell }) {
      watchExt(shell, '@moodlenet/webapp', webapp => {
        console.log(`************************************\n****************************************`, webapp)
        if (!webapp) {
          return
        }
        ;(webapp.gates.ensureExtension as any)?.({
          payload: {
            extId: kernelExtId,
            moduleLoc: resolve(__dirname, '..', '..'),
            cmpPath: `lib/v1/webapp`,
          },
        })
      })
      return async () => {}
    },
  })
  // extensions: {
  //   installAndActivate: asyncPort(
  //     shell =>
  //       async ({ extId, pkgLoc = `${extId.name}@${extId.version}` }: { pkgLoc?: string; extId: ExtensionId }) => {
  //         console.log((await pkgMng.install([pkgLoc])).all)
  //         extRequire(extId.name)
  //         shell.push({ extName: extId, path: ['activate'] }, {})
  //       },
  //   ),
  // }

  const kernelEnv: KernelEnv = {
    coreExts: [],
    activateExts: [],
    ...extEnv(kernelExtId.name),
  }
  console.log({ kernelEnv })

  await Promise.all(
    coreExtensions.map(async ([pkgLoc, extIdName]) => {
      console.log(`** KERNEL: installing ${extIdName} from ${pkgLoc}`)
      await pkgMng.install([pkgLoc])
      extRequire(extIdName)
      const extReg = getRegisteredExtension(extIdName)
      if (!extReg) {
        throw new Error(`[${extIdName}] located in [${pkgLoc}] didn't register Extension`)
      }
      if (extReg.deployment) {
        throw new Error(`extension [${extIdName}] already deployed`)
      }

      console.log(`** KERNEL: activating ${extReg.id.name}@${extReg.id.version}`)
      const startMessage = createMessage({
        payload: {},
        session: { user: {} },
        source: { extId: kernelExtId, path: '' },
        target: {
          extId: extReg.id,
          path: '',
        },
        parentMsgId: null,
      })
      const startShell = makeShell({ message: startMessage, cwAddress: { extId: extReg.id, path: '' } })
      const stop = await extReg.lifeCycle.start({ shell: startShell })
      extReg.deployment = {
        at: new Date(),
        stop,
      }
    }),
  )

  pushMessage(
    createMessage({
      payload: {},
      session: { user: {} },
      source: { extName: kernelExtId, path: [] },
      target: {
        extName: kernelExtId,
        path: ['activate'],
      },
      parentMsgId: null,
    }),
  )
}
