import type { FunTopo } from '../k'
import type { Ext, ExtDef, ExtId } from './ext'
import type { PkgInfo } from './pkg'
import type { DeploymentActionResult, ExtDeployment } from './reg'
import { Port } from './topo'

export type KernelExtPorts = {
  extension: {
    start: FunTopo<<Def extends ExtDef = ExtDef>(_: { ext: Ext<Def>; pkgInfo: PkgInfo }) => DeploymentActionResult<Def>>
    stop: FunTopo<<Def extends ExtDef = ExtDef>(_: { extId: ExtId<Def> }) => DeploymentActionResult<Def>>
    deployed: Port<ExtDeployment>
    undeployed: Port<ExtDeployment>
  }
}
export type KernelExt = ExtDef<'kernel.core', '0.0.1', KernelExtPorts>
