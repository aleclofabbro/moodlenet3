import { Opaque } from 'type-fest'
import { TypeofPath, TypePaths } from '../../path'
import { PortShell } from '../types'

export type ExtName = string
export type ExtVersion = string
export type ExtensionId<Name extends ExtName = ExtName, Version extends ExtVersion = ExtVersion> = {
  name: Name
  version: Version
}
export type ExtIdOf<ExtDef extends ExtensionDef> = Pick<ExtDef, keyof ExtensionId>

export type ExtensionDef<
  Name extends ExtName = ExtName,
  Version extends ExtVersion = ExtVersion,
  PortsTopo extends PortsTopology = PortsTopology,
> = ExtensionId<Name, Version> & {
  ports: PortsTopo
}

export type PortPath = string
export type Port<Payload> = Opaque<{ portPayload: Payload }>
export type PortsTopology = {
  [topoNodeName in string]: Port<any> | PortsTopology
}

export type PortPaths<Topo extends PortsTopology, Payload = any> = TypePaths<Topo, Port<Payload>>
export type ExtPortPaths<ExtDef extends ExtensionDef, Payload = any> = PortPaths<ExtDef['ports'], Payload>
export type PortPayload<P extends Port<any>> = P extends Port<infer PL> ? PL : never
export type PathPayload<ExtDef extends ExtensionDef, Path extends ExtPortPaths<ExtDef>> = TypeofPath<
  ExtDef['ports'],
  Path
> extends Port<infer Payload>
  ? Payload
  : never

export type ExtLCStart = (startArg: { shell: PortShell }) => Promise<ExtLCStop>
export type ExtLCStop = () => Promise<void>
export type ExtLifeCycleHandle = {
  start: ExtLCStart
}
