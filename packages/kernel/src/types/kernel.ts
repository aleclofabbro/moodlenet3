import type { RpcTopo } from '../shell-lib'
import type { PkgInfo } from './'
import type { ExtensionDef, ExtId, ExtName } from './ext'
import type { ExtensionRegistryRecord } from './reg'

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
export type KernelExt = ExtensionDef<'@moodlenet/kernel', '0.0.1', KernelExtPorts>
