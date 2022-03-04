import { createRequire } from 'module'
import { getExtensions } from './extension-registry/lib'
import { Extension } from './extension/extension'
import type { ExtensionId } from './extension/types'
import { createMessage, pushMessage } from './message'

const cfgPath = process.env.MN_EXT_ENV ?? `${process.cwd()}/mn-kernel-config`
// delete process.env.MN_EXT_ENV
let globalEnv: any = {}
try {
  globalEnv = require(cfgPath)
} catch (e) {
  console.warn(`couldn't require config:${cfgPath}, setting to {}`)
  console.warn(e)
}
export const extEnv = (extName: string) => globalEnv[extName]

type PkgMng = any /*  { npmcli: {
  install()...
} } */
type KernelEnv = {
  coreExts: string[]
  activateExts: string[]
}
export const kernelExtId: ExtensionId = {
  name: '@moodlenet/kernel',
  version: '1.0.0',
}
//TODO: returns something to pkgmng ?
export const boot = (pkgMng?: PkgMng) => {
  Extension(module, {
    ...kernelExtId,
    ports: {
      activate() {},
      deactivate() {},
    },
  })

  const extRequire = createRequire(pkgMng?.nodeModulesDir ?? process.cwd())
  const kernelEnv: KernelEnv = {
    coreExts: [],
    activateExts: [],
    ...extEnv(kernelExtId.name),
  }

  kernelEnv.coreExts.forEach((_) => extRequire(_))
  kernelEnv.activateExts.forEach((_) => extRequire(_))

  getExtensions()
    .sort((a, b) =>
      a.id.name === kernelExtId.name
        ? -1
        : b.id.name === kernelExtId.name
        ? 1
        : 0
    )
    .forEach((extReg) => {
      console.log(
        `** KERNEL: activating ${extReg.id.name}@${extReg.id.version} - [${extReg.pkgInfo.dir}]`
      )
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
        })
      )
    })

  // const installExt = async ({ pkgs }: { pkgs: string[] }) => {
  //   pkgMng?.npmcli.install(pkgs)
  //   return pkgs.map((pkg) => extRequire(pkg))
  // }

  // setTimeout(() => {
  //   pushMessage(
  //     createMessage({
  //       payload: {},
  //       session: { user: {} },
  //       source: { extId: kernelExtId, path: [] },
  //       target: {
  //         extId: { name: '@moodlenet/pri-http', version: '1.0.0' },
  //         path: ['deactivate'],
  //       },
  //     })
  //   )
  // }, 2000)
}
