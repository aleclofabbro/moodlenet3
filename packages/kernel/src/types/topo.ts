import type { TypeofPath, TypePaths } from './crawl-path'
import type { ExtDef } from './ext'

/*
 * Port Topology
 */

// export declare const PORT_NODE_SYM: unique symbol
// export declare const TOPO_BASE_SYM: unique symbol
// export declare const TOPO_NODE_SYM: unique symbol
// export declare const ROOT_TOPO_SYM: unique symbol
// export type PORT_LEAF_SYM = typeof PORT_NODE_SYM
// export type TOPO_BASE_SYM = typeof TOPO_BASE_SYM
// export type TOPO_NODE_SYM = typeof TOPO_NODE_SYM
// export type ROOT_TOPO_SYM = typeof ROOT_TOPO_SYM

export type TopoPath = string

// export type BaseTopoNode<CUSTOM_SYMBOL extends symbol = TOPO_BASE_SYM> = {
//   _ID?: CUSTOM_SYMBOL & TOPO_BASE_SYM
// }

export type Port<Payload = any /* , CUSTOM_SYMBOL extends symbol = PORT_LEAF_SYM */> = {
  payload: Payload
} //& BaseTopoNode /*<CUSTOM_SYMBOL & PORT_LEAF_SYM>*/

export type TopoStruct = {
  [topoElementName in string]?: Port | TopoNode //TopoElement
}
// export type TopoElement = Port | TopoNode

export type TopoNode</* CUSTOM_SYMBOL extends symbol = TOPO_NODE_SYM,  */ Struct extends TopoStruct = TopoStruct> =
  Struct
// & BaseTopoNode<CUSTOM_SYMBOL & TOPO_NODE_SYM>

export type RootTopo = TopoNode //<ROOT_TOPO_SYM>

export type ExtPortPaths<Ext extends ExtDef> = TypePaths<Ext['ports'], Port, Port> //& ExtTopoPaths<Ext>

export type ExtTopoPaths<Ext extends ExtDef, TargetTopoNode extends TopoNode = TopoNode> = TypePaths<
  Ext['ports'],
  TargetTopoNode,
  Port
>

export type ExtTopoNodePaths<Ext extends ExtDef> = ExtTopoPaths<Ext> | ExtPortPaths<Ext>

export type SemanticPointer<
  Def extends ExtDef = ExtDef,
  Path extends ExtTopoNodePaths<Def> = ExtTopoNodePaths<Def>,
> = `${Def['name']}::${Path}` //`;)

export type Pointer<
  Def extends ExtDef = ExtDef,
  Path extends ExtTopoNodePaths<Def> = ExtTopoNodePaths<Def>,
> = `${Def['name']}@${Def['version']}::${Path}` //`;)
export type Version = string

export type PortPayload<P extends Port> = P extends Port<infer PL> ? PL : never

export type PortPathPayload<Def extends ExtDef, Path extends ExtPortPaths<ExtDef>> = TypeofPath<
  Def['ports'],
  Path
> extends Port<infer Payload>
  ? Payload
  : never
