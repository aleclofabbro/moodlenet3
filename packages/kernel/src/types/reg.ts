import type { Ext, ExtDef, ExtLCStop } from './ext'
import type { PkgDiskInfo, PkgInfo } from './pkg'
export type { ExtLocalDeploymentRegistry } from '../registry'

export type ExtDeployment<Def extends ExtDef = ExtDef> = {
  ext: Ext<Def>
  pkgInfo: PkgInfo
  at: Date
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

export type PkgRegistryRecord = {
  pkgInfo: PkgDiskInfo
  exts: Ext[]
}
export type DeploymentActionResult<Def extends ExtDef> =
  | { done: false; currDeployment: undefined | ExtDeployment<ExtDef<Ext['name']>> }
  | { done: true; deployment: ExtDeployment<Def> }
