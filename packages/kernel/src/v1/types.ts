import { TypeofPath, TypePaths } from '../path'
import type { ExtensionDef, ExtPortPaths, PathPayload, Port } from './extension/types'
import { Message, Obj } from './message/types'
import { FullPortAddress } from './port-address/types'

export type PostOpts = {}
export type ExtensionUnavailable = undefined

export type LookupExt = <Ext extends ExtensionDef>(extName: Ext['name']) => LookupResult<Ext>
export type LookupResult<Ext extends ExtensionDef> =
  | ExtensionUnavailable
  | {
      port: LookupPort<Ext>
      active: true
    }
  | {
      port?: undefined
      active: false
    }

export type LookupPort<Ext extends ExtensionDef> = <Path extends TypePaths<Ext['ports'], Port<any>>>(
  path: Path,
) => PostInPort<Ext, Path>

export type PostInPort<Ext extends ExtensionDef, Path extends TypePaths<Ext['ports'], Port<any>>> = (
  portPayload: TypeofPath<Ext['ports'], Path>['portPayload'],
) => Message<TypeofPath<Ext['ports'], Path>['portPayload']>

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

export type PushMessage = <
  ExtDef extends ExtensionDef = ExtensionDef,
  Path extends ExtPortPaths<ExtDef> = ExtPortPaths<ExtDef>,
>(
  extName: ExtDef['name'],
  path: Path,
  payload: PathPayload<ExtDef, Path>,
) => PathPayload<ExtDef, Path> extends Obj ? Message<PathPayload<ExtDef, Path>> : never

export type Session = {
  user: User
}
export type User = {}
