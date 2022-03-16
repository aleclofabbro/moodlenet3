import { Opaque } from 'type-fest'
import { PortShell } from '../types'

export type ExtName = string
export type ExtVersion = string
export type ExtensionId<Name extends ExtName = ExtName, Version extends ExtVersion = ExtVersion> = {
  name: Name
  version: Version
}

export type ExtensionDef<
  Name extends ExtName = ExtName,
  Version extends ExtVersion = ExtVersion,
  PortsTopo extends PortsTopology = PortsTopology,
> = ExtensionId<Name, Version> & {
  topo: PortsTopo
}

export type PortPath = string
export type Port<Payload> = Opaque<{ portPayload: Payload }>
export type PortsTopology = Opaque<{
  [topoNodeName in string]: Port<any> | PortsTopology
}>

export type ExtLCStart = (startArg: { shell: PortShell }) => Promise<ExtLCStop>
export type ExtLCStop = () => Promise<void>
export type ExtLifeCycleHandle = {
  start: ExtLCStart
}
