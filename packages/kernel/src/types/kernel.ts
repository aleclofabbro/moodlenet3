import type { RpcTopo } from '../k'
import type { PkgInfo } from './'
import type { ExtDef, ExtId, ExtName } from './ext'
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
export type KernelExt = ExtDef<'@moodlenet/kernel', '0.0.1', KernelExtPorts>
