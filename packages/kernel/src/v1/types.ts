// import { TypeofPath, TypePaths } from '../path'
import type { ExtensionDef, ExtensionIdObj, ExtId, ExtPortPaths, /* Port, */ PortPathPayload } from './extension/types'
import { Message, Obj } from './message/types'
import type { PkgInfo } from './pkg-info'
import { FullPortAddress } from './port-address/types'

export type PostOpts = {}
export type ExtensionUnavailable = undefined

export type LookupExt = <Ext extends ExtensionDef>(extName: Ext['name']) => LookupResult<Ext> | undefined
export type LookupResult<Ext extends ExtensionDef> = {
  extId: ExtensionIdObj<Ext['name']>
  active: boolean
  pkgInfo: PkgInfo
}

// export type LookupPort<Ext extends ExtensionDef> = <Path extends TypePaths<Ext['ports'], Port<any>>>(
//   path: Path,
// ) => PostInPort<Ext, Path>

// export type PostInPort<Ext extends ExtensionDef, Path extends TypePaths<Ext['ports'], Port<any>>> = (
//   portPayload: TypeofPath<Ext['ports'], Path>['portPayload'],
// ) => Message<TypeofPath<Ext['ports'], Path>['portPayload']>

export type Listen = (_: PortListener) => Unlisten
export type PortListener = (shell: PortShell) => void
export type Unlisten = () => void

export type PortShell<Payload = any> = {
  message: Message<Payload>
  lookup: LookupExt
  env: any
  listen: Listen
  cwAddress: FullPortAddress
  push: PushMessage
}

export type PushMessage = <Ext extends ExtensionDef = ExtensionDef>(
  extId: ExtId<Ext>,
) => <Path extends ExtPortPaths<Ext>>(
  path: Path,
) => (
  payload: PortPathPayload<Ext, Path>,
) => PortPathPayload<Ext, Path> extends Obj ? Message<PortPathPayload<Ext, Path>> : never
