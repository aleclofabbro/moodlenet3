import { FunTopo } from '../k'
import type { ExtDef, ExtId } from './ext'
import { PkgInfo } from './pkg'
import type { ExtDeployment, ExtPkgInfo } from './reg'
import { Port } from './topo'

type StartResult<Def extends ExtDef = ExtDef> = {
  pkgInfo: PkgInfo
  extId: ExtId<Def>
  name: string
  description?: string | undefined
  requires: ExtId[]
}

export type KernelExtPorts = {
  extension: {
    start: FunTopo<<Def extends ExtDef = ExtDef>(_: ExtPkgInfo<Def>) => StartResult<Def>>
    stop: FunTopo<<Def extends ExtDef = ExtDef>(_: { extId: ExtId<Def> }) => boolean>
    deployed: Port<ExtDeployment>
    undeployed: Port<ExtDeployment>
  }
}
export type KernelExt = ExtDef<'kernel.core', '0.0.1', KernelExtPorts>
