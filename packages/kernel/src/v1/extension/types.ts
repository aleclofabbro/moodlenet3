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
export type ExtNameOf<ExtDef extends ExtensionDef> = ExtDef['name']
export type ExtCacheOf<ExtDef extends ExtensionDef> = ExtDef['cache']
export type ExtEnv = unknown

export type ExtensionDef<
  Name extends ExtName = ExtName,
  Version extends ExtVersion = ExtVersion,
  PortsTopo extends PortsTopology = PortsTopology,
  Cache = unknown,
> = ExtensionId<Name, Version> & {
  ports: PortsTopo
  cache: Cache
}

export type PortPath = string
export type Port<Payload> = Opaque<{ portPayload: Payload }>

export type TopologyNode = Port<any> | PortsTopology
export type PortsTopology = {
  [topoNodeName in string]: TopologyNode
}

export type PortPaths<Topo extends PortsTopology, Payload = any> = TypePaths<Topo, Port<Payload>>
export type ExtPortPaths<ExtDef extends ExtensionDef, Payload = any> = PortPaths<ExtDef['ports'], Payload>

export type ExtPointerPaths<ExtDef extends ExtensionDef, TopoNode extends TopologyNode = TopologyNode> = TypePaths<
  ExtDef['ports'],
  TopoNode
>

// export type ExtPointer<
//   ExtDef extends ExtensionDef,
//   TopoNode extends TopologyNode = Port<any>,
//   P extends ExtPointerPaths<ExtDef, TopoNode> = ExtPointerPaths<ExtDef, TopoNode>,
// > = {
//   p: P
//   fp: `${ExtDef['name']}/${P}`
//   type: TypeofPath<ExtDef['ports'], P>
// }

export type Pointer<
  Ext extends ExtensionDef,
  NodeType extends TopologyNode,
  Path extends ExtPointerPaths<Ext, NodeType>,
> = [`${Ext['name']}::${Path}`, TypeofPath<Ext['ports'], Path>?]

// export type ExtPointerFullPaths<
//   ExtDef extends ExtensionDef,
//   TopoNode extends TopologyNode = Port<any>,
// > = `${ExtDef['name']}/${ExtPointerPaths<ExtDef, TopoNode>}`

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
