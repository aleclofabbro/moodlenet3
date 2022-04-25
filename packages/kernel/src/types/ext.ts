// import type * as K from '../k'
import type { Observable, Subscription } from 'rxjs'
import type { Message } from './message'
import { PkgInfo } from './pkg'
import type { Port, PortBinding, PortPathData, PortPaths, Topo } from './topo'

// export type KernelLib = typeof K
export type ExtVersion = string

export type ExtId<Def extends ExtDef = ExtDef> = `${Def['name']}@${Def['version']}` //` ;)
export type ExtName<Def extends ExtDef = ExtDef> = `${Def['name']}` //` ;)
export type ExtTopo<Def extends ExtDef = ExtDef> = Def['topo']

export type ExtDef<
  Name extends string = string,
  Version extends ExtVersion = ExtVersion,
  ExtTopo extends Topo = Topo,
> = {
  name: Name
  version: Version
  topo: ExtTopo & { '': Port<PortBinding, any> }
}
export type ExtTopoDef<Def extends ExtTopo> = Def

type _Unsafe_ExtId<Def = ExtDef> = Def extends ExtDef ? ExtId<Def> : never
export type Ext<Def extends ExtDef = ExtDef, Requires extends ExtDef[] = ExtDef[]> = {
  id: ExtId<Def>
  displayName: string
  requires: { [Index in keyof Requires]: _Unsafe_ExtId<Requires[Index]> }
  start: ExtLCStart<Def>
  description?: string
}

export type RawExtEnv = Record<string, any>

export interface Shell<Def extends ExtDef = ExtDef> {
  msg$: Observable<Message>
  push: PushMessage<Def>
  emit: EmitMessage<Def>
  send: SendMessage
  env: RawExtEnv
  extId: ExtId<Def>
  pkgInfo: PkgInfo
  tearDown: Subscription
  expose: ExposePointers<Def>
  isExtAvailable: ExtAvailable
}

type ExtAvailable = (extId: ExtId) => boolean

export type MWFn = (msg: Message, index: number) => Observable<Message>

export type ExtLCStart<Def extends ExtDef = ExtDef> = (_: Shell<Def>) => void | ExtHandle
export type ExtHandle = {
  mw?: MWFn
}

export type EmitMessage<SrcDef extends ExtDef = ExtDef> = <Path extends PortPaths<SrcDef, 'out'>>(
  path: Path,
) => (data: PortPathData<SrcDef, Path, 'out'>, opts?: Partial<PushOptions>) => Message<'out', SrcDef, SrcDef, Path>

export type SendMessage = <DestDef extends ExtDef = ExtDef>(
  extId: ExtId<DestDef>,
) => <Path extends PortPaths<DestDef, 'in'>>(
  path: Path,
) => (data: PortPathData<DestDef, Path, 'in'>, opts?: Partial<PushOptions>) => Message<'in', DestDef, DestDef, Path>

export type PushMessage<SrcDef extends ExtDef = ExtDef> = <Bound extends PortBinding = PortBinding>(
  bound: Bound,
) => <DestDef extends ExtDef = SrcDef>(
  destExtId: ExtId<DestDef>,
) => <Path extends PortPaths<DestDef, Bound>>(
  path: Bound extends 'in' ? Path : SrcDef extends DestDef ? Path : never,
) => (data: PortPathData<DestDef, Path, Bound>, opts?: Partial<PushOptions>) => Message<Bound, SrcDef, DestDef, Path>

export type PushOptions = {
  parent: Message | null
  primary: boolean
  sub: boolean
}

export type ExposedPointer = {
  validateData(data: unknown): boolean
  subResult: 'array' | 'stream'
}

export type ExposePointers<Def extends ExtDef = ExtDef> = (p: Partial<ExposedPointerMap<Def>>) => void

export type ExposedPointerMap<Def extends ExtDef = ExtDef> = {
  [path in PortPaths<Def, 'in'>]: ExposedPointer
}
