import { Observable, ObservableInput, ObservableNotification, TeardownLogic } from 'rxjs'
import { ExtDef, ExtTopo, MessagePush, Port, TopoNode, TopoPaths, TypeofPath } from '../../types'

export type SubcriptionPaths<Def extends ExtDef> = TopoPaths<Def, SubTopo<any, any>> & TopoPaths<Def>

export type SubcriptionReq<Def extends ExtDef, Path extends SubcriptionPaths<Def>> = TypeofPath<
  ExtTopo<Def>,
  Path
> extends SubTopo<infer Req, any>
  ? Req
  : never

export type SubcriptionVal<Def extends ExtDef, Path extends SubcriptionPaths<Def>> = TypeofPath<
  ExtTopo<Def>,
  Path
> extends SubTopo<any, infer Val>
  ? Val
  : never

export type SubReqData<Req> = {
  req: Req
}

// export type UnsubData = {
//   id: MsgID
// }

export type ItemData<Val> = {
  item: ObservableNotification<Val>
}

export type SubTopo<SubReq, SubVal> = TopoNode<{
  sub: Port<'in', SubReqData<SubReq>>
  unsub: Port<'in', void /* |UnsubData */>
  // unsubOut: Port<'out', UnsubData>
  item: Port<'out', ItemData<SubVal>>
}>

export type ValItemOf<Topo> = Topo extends SubTopo<any, infer Val>
  ? { val: Val; msg: MessagePush }
  : { val: unknown; msg: MessagePush }
export type ValMsgObsOf<Topo> = Topo extends SubTopo<any, infer Val>
  ? Observable<{ val: Val; msg: MessagePush }>
  : Observable<{ val: unknown; msg: MessagePush }>
export type ValPromiseOf<Topo> = Topo extends SubTopo<any, infer Val>
  ? Promise<{ val: Val; msg: MessagePush }>
  : Promise<{ val: unknown; msg: MessagePush }>
export type ValOf<Topo> = Topo extends SubTopo<any, infer Val> ? Val : unknown
export type ValObsInputOf<Topo> = Topo extends SubTopo<any, infer Val> ? ObservableInput<Val> : ObservableInput<unknown>
export type ProvidedValOf<Topo> = ValObsInputOf<Topo> | [valObsinput: ValObsInputOf<Topo>, tearDownLogic: TeardownLogic]

export type ValObsProviderOf<Topo> = Topo extends SubTopo<infer Req, any>
  ? (_: { req: Req; msg: MessagePush }) => ProvidedValOf<Topo>
  : (_: { req: unknown; msg: MessagePush }) => ProvidedValOf<Topo>
