import type { PackageJson } from 'type-fest'
// export interface AnnotatedExtComponent {
//   name: string
//   description?: string
// }
export type Obj = any //Record<string, any>

export type PkgInfo = {
  dir: string
  json: NodePackageJson
}

export type MNPackageJsonExt = {
  displayName?: string
  shortDesc?: string
  description?: string
  webappExtensionFile?: string
}

export type NodePackageJson = Omit<PackageJson, 'name' | 'version'> & {
  moodlenet: MNPackageJsonExt
  name: string
  version: string
}

type Path = string[]
export type PortAddress = {
  extId: ExtensionId
  path: Path
}

export type PostOpts = {}
export type MsgID = string
export type Message<Payload extends Obj = Obj> = {
  id: MsgID
  target: PortAddress
  source: PortAddress
  session: Session
  payload: Payload
  ctx: Obj
}

type ExtName = string
type ExtVersion = string
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

export type GetMsg = <P extends Obj>(gate: Gate<P>) => Message<P> | undefined

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

export type Guard = (message: Message) => any

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

type ActivateExtPayload = {}
type DeactivateExtPayload = {}
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
    ? GatesTopo[NodeName]
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

export type ExtensionUnavailable = undefined

export type ShellLookup = <Ext extends ExtensionDef>(
  name: Ext['name']
) => ShellGatedExtension<Ext> | ExtensionUnavailable

export type PostOutcome = void

export type PortListener = (shell: PortShell<Obj>) => void
export type Listen = (_: PortListener) => Unlisten
type Unlisten = () => void
export type PortShell<Payload = unknown> = {
  message: Message<Payload>
  lookup: ShellLookup
  env: any
  listen: Listen
  isMsg: IsGateMsg
  getMsg: GetMsg
}

export type Session = {
  user: User
}

export type User = {}

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
