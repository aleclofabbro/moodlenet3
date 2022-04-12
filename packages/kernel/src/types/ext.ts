import type * as K from '../k'
import type { PortShell } from './shell'
import type { RootTopo } from './topo'

export type KernelLib = typeof K
export type ExtName = string
export type ExtVersion = string
export type ExtId<Def = ExtDef> = Def extends ExtDef ? `${Def['name']}@${Def['version']}` : never

export type ExtDef<
  Name extends ExtName = ExtName,
  Version extends ExtVersion = ExtVersion,
  ExtRootTopo extends RootTopo = RootTopo,
> = {
  name: Name
  version: Version
  ports: ExtRootTopo
}

export type Ext<Def extends ExtDef, Requires extends readonly ExtDef[] = []> = {
  id: ExtId<Def>
  name: string
  requires: { [Index in keyof Requires]: ExtId<Requires[Index]> }
  start: ExtLCStart
  description?: string
}

export type ExtLCStart = (startArg: {
  mainShell: PortShell
  env: Record<string, unknown>
  K: KernelLib
}) => ExtLCStop | void

export type StopObj = { reason: StopReason }
export type ExtLCStop = (stopObj: StopObj) => Promise<unknown> | unknown

export type StopReason =
  | 'REQUIRED_EXTENSION_DISABLED'
  | 'USER_REQUEST'
  | 'SHUTDOWN'
  | 'UNKNOWN'
  | 'UNKNOWN'
  | 'UNKNOWN'
  | 'UNKNOWN'
