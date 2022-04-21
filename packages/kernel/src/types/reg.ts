import type { Subject, Subscription } from 'rxjs'
import type { Ext, ExtDef, MWFn } from './ext'
import type { Message } from './message'
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
export type ExtDeploymentBindings = {
  $msg$: Subject<Message>
  mw: MWFn | void
  tearDown: Subscription
}

export type ExtDeployable<Def extends ExtDef = ExtDef> = ExtPkg<Def> & ExtDeploymentBindings
export type ExtDeployment<Def extends ExtDef = ExtDef> = ExtDeployable<Def> & DeplStatusObj

export type DeploymentActionResult<Def extends ExtDef> =
  | { done: true; deployment: ExtDeployment<Def> }
  //| { done: false; currDeployment: undefined | ExtDeployment<ExtDef<ExtName<Def>>> } //<-- why ExtDef<ExtName<Def>> ? because it shouldn't happen, so we can't asssume same version, but surely same name::  `const reg: { [Name in ExtName]: ExtDeployment }={}`
  | { done: false; currDeployment: undefined | ExtDeployment<Def> } // <-- ... but currently registry.get(extId) checks compat and returns undefined if no match

export type PackageExt = {
  pkgDiskInfo: PkgDiskInfo
  exts: Ext[]
}

export type PkgRegistry = PackageExt[]
