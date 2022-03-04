// export interface AnnotatedExtComponent {
//   name: string
//   description?: string

import { Message } from '../message/types'
import { PortAddress } from '../port-address/types'
import { Obj, PortShell, Session } from '../types'

/////

export type ExtName = string
export type ExtVersion = string
export type ExtensionId<
  Name extends ExtName = ExtName,
  Version extends ExtVersion = ExtVersion
> = {
  name: Name
  version: Version
}

export type IsGateMsg = <P extends Obj>(
  gate: Gate<P> | ShellGate<P>,
  msg: Message
) => msg is Message<P>

export type ExtensionDef<
  Name extends ExtName = ExtName,
  Version extends ExtVersion = ExtVersion,
  PortsTopo extends RootPortsTopology = RootPortsTopology
> = ExtensionId<Name, Version> & {
  ports: PortsTopo
}

export type PortOutcome = void
export type RawPort<Payload> = (shell: PortShell<Payload>) => PortOutcome
export type Port<Payload> = WithPortMeta & RawPort<Payload>

export type Guard = (shell: PortShell) => unknown

export type PortMeta = {
  guard?: Guard
}
export type WithPortMeta = {
  meta?: PortMeta
}

export type GateMeta = PortMeta & {
  address: PortAddress
}
/*TODO: should rather be ?
export type GateMeta = {
  port: PortMeta 
  meta: GateMeta
}*/

export type WithGateMeta = {
  meta: GateMeta
}
export type RawGate<Payload> = (_: {
  session: Session
  source: PortAddress
}) => ShellGate<Payload>
export type Gate<Payload> = WithGateMeta & RawGate<Payload>

export type RawShellGate<Payload> = (_: {
  payload: Payload
}) => Message<Payload>
export type ShellGate<Payload> = WithGateMeta & RawShellGate<Payload>

export type ActivateExtPayload = {}
export type DeactivateExtPayload = {}
export type RootPortsTopology = {
  activate: Port<ActivateExtPayload>
  deactivate: Port<DeactivateExtPayload>
  [invalid: symbol]: never
} & PortsTopology

export type PortTopologyNode<P extends Obj = Obj> = PortsTopology | Port<P>
export type PortsTopology = {
  [nodeName: string]: PortTopologyNode<any>
  [invalid: symbol]: never
}

export type GatesTopology<PortsTopo extends PortsTopology = PortsTopology> = {
  [NodeName in keyof PortsTopo]: PortsTopo[NodeName] extends Port<infer Payload>
    ? Gate<Payload>
    : PortsTopo[NodeName] extends PortsTopology
    ? GatesTopology<PortsTopo[NodeName]>
    : never
}

export type ShellGatesTopology<
  GatesTopo extends GatesTopology = GatesTopology
> = {
  [NodeName in keyof GatesTopo]: GatesTopo[NodeName] extends Gate<infer Payload>
    ? ShellGate<Payload>
    : GatesTopo[NodeName] extends GatesTopology
    ? ShellGatesTopology<GatesTopo[NodeName]>
    : never
}

export type GatedExtension<ExtDef extends ExtensionDef = ExtensionDef> = {
  def: ExtDef
  gates: GatesTopology<ExtDef['ports']>
  id: ExtensionId<ExtDef['name'], ExtDef['version']>
}
export type ShellGatedExtension<ExtDef extends ExtensionDef = ExtensionDef> = {
  gates: ShellGatesTopology<GatesTopology<ExtDef['ports']>>
  id: ExtensionId<ExtDef['name'], ExtDef['version']>
}

/*


type Xt = ExtensionDef<
  'aa',
  '1',
  {
    k: Port<{ d: string }>
    a: {
      b: {
        k: Port<{ d: string }>
        c: Port<{}>
      }
      rr: ReqResPorts<RRF>
    }
  }
>

declare const extDef: Xt
declare const session: Session
declare const source: PortAddress

declare const shell: PortShell<unknown>
declare const msg: Message<unknown>
const ext = shell.lookup<Xt>('aa')
if (ext) {
  const x = ext.gates.a.b.k({ session, source })({ payload: { d: '' } })
  const y = ext.gates.a.b.c({ session, source })({ payload: {} })
  if (shell.isMsg(ext.gates.a.b.k, shell.message)) {
    shell.message.payload
  }
  if (shell.isMsg(ext.gates.a.b.k, msg)) {
    msg.payload.d
  }
  const __ = shell.getMsg(ext.gates.a.b.k)
  __?.payload.d
}
const port: Port<{ x: 21 }> = (shell) => {
  shell.message.payload.x
}
port.topo_meta = { address: source }
type ReqResPorts<F extends (arg: any) => any> = {
  req: Port<Parameters<F>[0]>
  res: Port<ReturnType<F>>
}

type ReqResGates<F extends (arg: any) => any> = GatesTopology<ReqResPorts<F>>

type ReqResStrategy = <F extends (arg: any) => any>(
  f: (shell: PortShell<Parameters<F>[0]>) => ReturnType<F>
) => ReqResPorts<F>

type Request = <F extends (arg: any) => any>(gates: ReqResGates<F>) => F

type RRF = <T, K>(k: K) => { tt: T; kk: K }
declare const reqResStrategy: ReqResStrategy
declare const requestGate: Request

if (ext) {
  ext.gates.a.rr.req({ session, source })({ payload: {} })
  const req = requestGate(ext.gates.a.rr)
  const rr = req(100)
}
*/
