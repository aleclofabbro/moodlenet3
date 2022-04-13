import { ExtDef, ExtTopoPaths, Port, PortShell, TopoNode, TypeofPath } from '../../types'

// export declare const RPC_TOPO_SYM: symbol
// export type RPC_TOPO_SYM = typeof RPC_TOPO_SYM

export type RpcFn = (...rpcTopoReqArgs: any) => Promise<any>
//export type RpcTopoPaths<Topo extends Topology> = TopoPaths<Topo, RPC_TOPO_SYM>
export type ExtRpcTopoPaths<Def extends ExtDef> = ExtTopoPaths<Def, RpcTopo<RpcFn>> & ExtTopoPaths<Def>
export type ExtPathRpcFn<Def extends ExtDef, Path extends ExtRpcTopoPaths<Def>> = TypeofPath<
  Def['ports'],
  Path
> extends RpcTopo<infer Afn>
  ? Afn
  : never

export type RpcFnOf<T> = T extends RpcTopo<infer Afn> ? Afn : never

export type RpcTopoRequestPort<Afn extends RpcFn> = Port<{ rpcTopoReqArgs: Parameters<Afn> }>
export type RpcTopoResponsePort<Afn extends RpcFn> = Port<
  { rpcTopoRespValue: Awaited<ReturnType<Afn>> } | { rpcTopoRespError: any }
>

export type RpcTopo<Afn extends RpcFn> = TopoNode<{
  rpcTopoRequest: RpcTopoRequestPort<Afn>
  rpcTopoResponse: RpcTopoResponsePort<Afn>
}>

export type RpcTopoFnOf<T> = (shell: PortShell<{ rpcTopoReqArgs: Parameters<RpcFnOf<T>> }>) => RpcFnOf<T>
