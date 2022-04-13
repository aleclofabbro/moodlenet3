import type { Ext, ExtDef, ExtLCStop } from './ext'
import type { PkgDiskInfo, PkgInfo } from './pkg'
export type { ExtLocalDeploymentRegistry } from '../registry'

export type ExtPkgInfo<Def extends ExtDef = ExtDef> = {
  pkgInfo: PkgInfo
  ext: Ext<Def>
}

export type ExtDeployment<Def extends ExtDef = ExtDef> = ExtPkgInfo<Def> & {
  startAt: Date
  stopAt?: Date
} & (
    | {
        stop: ExtLCStop
        status: 'deployed' | 'undeploying'
      }
    | {
        stop: undefined | void
        status: 'deploying'
      }
  )

export type DeploymentActionResult<Def extends ExtDef> =
  | { done: false; currDeployment: undefined | ExtDeployment<ExtDef<Ext['name']>> }
  | { done: true; deployment: ExtDeployment<Def> }

export type ExtPackage = {
  pkgDiskInfo: PkgDiskInfo
  exts: Ext[]
}

export type PkgRegistry = ExtPackage[]
