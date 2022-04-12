import type { Ext, ExtDef, ExtId, ExtLCStop } from './ext'
import type { PkgInfo } from './pkg'

export type Deployment = {
  at: Date
  stop: ExtLCStop
}
export type ExtensionRegistryRecord<Def extends ExtDef = ExtDef> = {
  extId: ExtId<ExtDef>
  deployment: 'deploying' | Deployment | undefined
  pkgInfo: PkgInfo
  lifeCycle: Ext<Def>
}
