import { Observable, ObservableInput, ObservableNotification, TeardownLogic } from 'rxjs'
import { ExtDef, ExtTopo, IMessage, Port, TopoNode, TopoPaths, TypeofPath } from '../../types'

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

// export type ValItemOf<Topo> = { msg: IMessage<ObsNotifValOf<Topo>> }
export type SubMsgObsOf<Topo> = Observable<{ msg: IMessage<ObsNotifValOf<Topo>> }>
export type ValPromiseOf<Topo> = Promise<{ msg: IMessage<ValOf<Topo>> }>
export type ObsNotifValOf<Topo> = ItemData<ValOf<Topo>>
export type ValOf<Topo> = Topo extends SubTopo<any, infer Val> ? Val : unknown
export type ReqOf<Topo> = Topo extends SubTopo<infer Req, any> ? Req : unknown
export type ProviderValObsInputOf<Topo> = ObservableInput<ValOf<Topo>>
export type ProvidedValOf<Topo> =
  | ProviderValObsInputOf<Topo>
  | [valObsinput: ProviderValObsInputOf<Topo>, tearDownLogic: TeardownLogic]

export type ValObsProviderOf<Topo> = (_: { msg: IMessage<SubReqData<ReqOf<Topo>>> }) => ProvidedValOf<Topo>
