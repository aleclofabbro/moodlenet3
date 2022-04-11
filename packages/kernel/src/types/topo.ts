import type { TypeofPath, TypePaths } from './crawl-path'
import type { ExtensionDef } from './ext'

/*
 * Port Topology
 */

// export declare const PORT_NODE_SYM: unique symbol
export declare const TOPO_BASE_SYM: unique symbol
export declare const TOPO_NODE_SYM: unique symbol
export declare const ROOT_TOPO_SYM: unique symbol
// export type PORT_LEAF_SYM = typeof PORT_NODE_SYM
export type TOPO_BASE_SYM = typeof TOPO_BASE_SYM
export type TOPO_NODE_SYM = typeof TOPO_NODE_SYM
export type ROOT_TOPO_SYM = typeof ROOT_TOPO_SYM

export type TopoPath = string

export type BaseTopoNode<CUSTOM_SYMBOL extends symbol = TOPO_BASE_SYM> = {
  _ID?: CUSTOM_SYMBOL & TOPO_BASE_SYM
}

export type Port<Payload = any /* , CUSTOM_SYMBOL extends symbol = PORT_LEAF_SYM */> = {
  payload: Payload
} & BaseTopoNode /*<CUSTOM_SYMBOL & PORT_LEAF_SYM>*/

export type TopoStruct = {
  [topoElementName in string]?: TopoElement
}

export type TopoNode<CUSTOM_SYMBOL extends symbol = TOPO_NODE_SYM, Struct extends TopoStruct = TopoStruct> = Struct &
  BaseTopoNode<CUSTOM_SYMBOL & TOPO_NODE_SYM>

export type TopoElement = Port | TopoNode

export type RootTopo = TopoNode<ROOT_TOPO_SYM>

export type ExtPortPaths<Ext extends ExtensionDef> = TypePaths<Ext['ports'], Port, Port> //& ExtTopoPaths<Ext>

export type ExtTopoPaths<Ext extends ExtensionDef, TargetTopoNode extends TopoNode = TopoNode> = TypePaths<
  Ext['ports'],
  TargetTopoNode,
  Port
>

export type ExtTopoNodePaths<Ext extends ExtensionDef> = ExtTopoPaths<Ext> | ExtPortPaths<Ext>

export type SemanticPointer<
  Ext extends ExtensionDef = ExtensionDef,
  Path extends ExtTopoNodePaths<Ext> = ExtTopoNodePaths<Ext>,
> = `${Ext['name']}::${Path}` //`;)

export type Pointer<
  Ext extends ExtensionDef = ExtensionDef,
  Path extends ExtTopoNodePaths<Ext> = ExtTopoNodePaths<Ext>,
> = `${Ext['name']}@${Ext['version']}::${Path}` //`;)
export type Version = string

export type PortPayload<P extends Port> = P extends Port<infer PL> ? PL : never

export type PortPathPayload<ExtDef extends ExtensionDef, Path extends ExtPortPaths<ExtDef>> = TypeofPath<
  ExtDef['ports'],
  Path
> extends Port<infer Payload>
  ? Payload
  : never
