import { Subject } from 'rxjs'
import type { DeploymentShell, Ext, ExtDef, ExtDeployable, ExtInst, Shell } from './ext'
import { IMessage } from './message'
export type { ExtLocalDeployableRegistry as ExtLocalDeploymentRegistry } from '../registry'
export type PkgInfo = {
  name: string
  version: string
}

export type RegDeployable<Def extends ExtDef = ExtDef> = ExtDeployable<Def> & {
  pkgInfo: PkgInfo
  ext: Ext<Def>
  shell: Shell<Def>
  deployment?: RegDeployment<Def>
  $msg$: Subject<IMessage<any>>
  at: Date
}

export interface RegDeployment<Def extends ExtDef = ExtDef> extends DeploymentShell<Def> {
  at: Date
  inst: ExtInst<Def>
}
