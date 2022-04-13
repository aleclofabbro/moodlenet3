import { FunTopo } from '../k'
import type { ExtDef, ExtId } from './ext'
import type { DeploymentActionResult, ExtDeployment, ExtPkgInfo } from './reg'
import { Port } from './topo'

export type KernelExtPorts = {
  extension: {
    start: FunTopo<<Def extends ExtDef = ExtDef>(_: ExtPkgInfo<Def>) => DeploymentActionResult<Def>>
    stop: FunTopo<<Def extends ExtDef = ExtDef>(_: { extId: ExtId<Def> }) => DeploymentActionResult<Def>>
    deployed: Port<ExtDeployment>
    undeployed: Port<ExtDeployment>
  }
}
export type KernelExt = ExtDef<'kernel.core', '0.0.1', KernelExtPorts>
