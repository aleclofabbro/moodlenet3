import { ExtDef, Port, PortShell, TopoNode, TopoPaths, TypeofPath } from '../../types'

// export declare const FUN_TOPO_SYM: symbol
// export type FUN_TOPO_SYM = typeof FUN_TOPO_SYM

export type Fun = (...funTopoReqArgs: any) => any

export type ExtFunTopoPaths<Def extends ExtDef> = TopoPaths<Def, FunTopo<Fun>> & TopoPaths<Def>
export type ExtPathFunFn<Def extends ExtDef, Path extends ExtFunTopoPaths<Def>> = TypeofPath<
  Def['ports'],
  Path
> extends FunTopo<infer Fn>
  ? Fn
  : never

export type FunOf<T> = T extends FunTopo<infer Fn> ? Fn : never

export type FunTopoRequestPort<Fn extends Fun> = Port<{ funTopoReqArgs: Parameters<Fn> }>
export type FunTopoResponsePort<Fn extends Fun> = Port<
  { funTopoRespValue: Awaited<ReturnType<Fn>> } | { funTopoRespError: any }
>

export type FunTopo<Fn extends Fun> = TopoNode<{
  funTopoRequest: FunTopoRequestPort<Fn>
  funTopoResponse: FunTopoResponsePort<Fn>
}>

export type FunTopoFnOf<T> = (shell: PortShell<{ funTopoReqArgs: Parameters<FunOf<T>> }>) => FunOf<T>
