import { Subject } from 'rxjs'
import type { DeploymentShell, Ext, ExtDef, ExtDeployable, ExtDeployment, Shell } from './ext'
import { IMessage } from './message'
export type { ExtLocalDeploymentRegistry as ExtLocalDeploymentRegistry } from '../registry'
export type PkgInfo = {
  name: string
  version: string
}

export type RegDeployment<Def extends ExtDef = ExtDef> = Shell<Def> &
  ExtDeployable<Def> &
  DeploymentShell &
  ExtDeployment<Def> & {
    ext: Ext<Def>
    $msg$: Subject<IMessage<any>>
    at: Date
  }
