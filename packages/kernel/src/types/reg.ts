import { Subject } from 'rxjs'
import type { Ext, ExtDef } from './ext'
import { Message } from './message'
import type { PkgDiskInfo, PkgInfo } from './pkg'
export type { ExtLocalDeploymentRegistry } from '../registry'

export type ExtPkg<Def extends ExtDef = ExtDef> = {
  pkgInfo: PkgInfo
  ext: Ext<Def>
}
export type DeplStatus = 'starting' | 'ready' | 'stopping'
export type DeplStatusObj<S extends DeplStatus = DeplStatus> = {
  status: S
  at: Date
}
export type ExtDeploymentBindings<Def> = {
  $msg$: Subject<Message>
  rmMW(): void
}

export type ExtDeployable<Def extends ExtDef = ExtDef> = ExtPkg<Def> & ExtDeploymentBindings<Def>
export type ExtDeployment<Def extends ExtDef = ExtDef> = ExtDeployable<Def> & DeplStatusObj

export type DeploymentActionResult<Def extends ExtDef> =
  | { done: true; deployment: ExtDeployment<Def> }
  // | { done: false; currDeployment: undefined | ExtDeployment<ExtDef<ExtName<Def>>> } //<-- WHY ExtDef<ExtName<Def>> ?
  | { done: false; currDeployment: undefined | ExtDeployment<Def> }

export type PackageExt = {
  pkgDiskInfo: PkgDiskInfo
  exts: Ext[]
}

export type PkgRegistry = PackageExt[]
