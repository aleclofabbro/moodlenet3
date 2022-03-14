import type { Boot } from '@moodlenet/pkg-mng/lib/v1/types'
import { createRequire } from 'module'
import { resolve } from 'path'
import { getRegisteredExtension } from './extension-registry/lib'
import { Extension } from './extension/extension'
import type { ExtensionId } from './extension/types'
import { watchExt } from './lib/flow'
import { asyncPort } from './lib/port'
import { createMessage, pushMessage } from './message'

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
  Extension(module, {
    ...kernelExtId,
    ports: {
      activate(shell) {
        // watchExt<WebappExt>(shell, '@moodlenet/webapp', gatedExt => {
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
      },
      deactivate() {},
      extensions: {
        installAndActivate: asyncPort(_shell => async (pkgLoc: string) => {
          const execaRet = await pkgMng.install([pkgLoc])
          return execaRet.all
        }),
      },
    },
  })

  const extRequire = createRequire(pkgMng?.nodeModulesDir ?? process.cwd())
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
        throw new Error(`TODO: core extension [${extIdName}] with pkgLoc [${pkgLoc}] not registered`)
      }
      console.log(`** KERNEL: activating ${extReg.id.name}@${extReg.id.version}`)
      extReg.active = true
      pushMessage(
        createMessage({
          payload: {},
          session: { user: {} },
          source: { extId: kernelExtId, path: [] },
          target: {
            extId: extReg.id,
            path: ['activate'],
          },
          parentMsgId: null,
        }),
      )
    }),
  )

  pushMessage(
    createMessage({
      payload: {},
      session: { user: {} },
      source: { extId: kernelExtId, path: [] },
      target: {
        extId: kernelExtId,
        path: ['activate'],
      },
      parentMsgId: null,
    }),
  )
}
