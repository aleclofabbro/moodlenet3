import type { ExtEnv, ExtId, ExtImpl, ExtLCStop } from './ext'
import type { PkgInfo } from './pkg'

export type Deployment = {
  at: Date
  stop: ExtLCStop
}
export type ExtensionRegistryRecord<_ExtId extends ExtId = ExtId> = {
  extId: _ExtId
  env: ExtEnv
  deployment: 'deploying' | Deployment | undefined
  pkgInfo: PkgInfo
  lifeCycle: ExtImpl
}
