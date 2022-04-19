import { Observable, ObservableInput, ObservableNotification, TeardownLogic } from 'rxjs'
import { ExtDef, ExtTopo, Message, MsgID, Port, TopoNode, TopoPaths, TypeofPath } from '../../types'

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

export type UnsubData = {
  id: MsgID
}

export type ItemData<Val> = {
  item: ObservableNotification<Val>
}

export type SubTopo<SubReq, SubVal> = TopoNode<{
  sub: Port<'in', SubReqData<SubReq>>
  unsub: Port<'in', void /* |UnsubData */>
  // unsubOut: Port<'out', UnsubData>
  item: Port<'out', ItemData<SubVal>>
}>

export type ValItemOf<Topo> = Topo extends SubTopo<any, infer Val> ? { item: Val; msg: Message } : never
export type ValObsOf<Topo> = Topo extends SubTopo<any, infer Val> ? Observable<{ item: Val; msg: Message }> : never
export type ValObsInputOf<Topo> = Topo extends SubTopo<any, infer Val> ? ObservableInput<Val> : never
export type ProvidedValOf<Topo> = ValObsInputOf<Topo> | [valObsinput: ValObsInputOf<Topo>, tearDownLogic: TeardownLogic]

export type ValObsProviderOf<Topo> = Topo extends SubTopo<infer Req, any>
  ? (_: { req: Req; msg: Message }) => ProvidedValOf<Topo>
  : never
