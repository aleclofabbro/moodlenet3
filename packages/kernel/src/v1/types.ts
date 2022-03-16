import { TypeofPath, TypePaths } from '../path'
import { ExtensionDef, Port } from './extension/types'
import { Message } from './message/types'
import { PortAddress } from './port-address/types'

export type PostOpts = {}
export type ExtensionUnavailable = undefined

export type LookupExt = <Ext extends ExtensionDef>(extName: Ext['name']) => LookupPort<Ext>

type LookupPort<Ext extends ExtensionDef> = <Path extends TypePaths<Ext['topo'], Port<any>>>(
  path: Path,
) => PostInPort<Ext, Path>

type PostInPort<Ext extends ExtensionDef, Path extends TypePaths<Ext['topo'], Port<any>>> = (
  portPayload: TypeofPath<Ext['topo'], Path>['portPayload'],
) => Message<TypeofPath<Ext['topo'], Path>['portPayload']>

export type Listen = (_: PortListener) => Unlisten
export type PortListener = (shell: PortShell) => void
export type Unlisten = () => void

export type PortShell<Payload = any> = {
  message: Message<Payload>
  lookup: LookupExt
  env: any
  listen: Listen
  cwAddress: PortAddress
  push: PushMessage
}

export type PushMessage = <Payload>(portAddr: PortAddress, payload: Payload) => Message<Payload>

export type Session = {
  user: User
}
export type User = {}
