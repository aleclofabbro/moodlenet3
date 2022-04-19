import { Observable, ObservableInput, ObservableNotification, TeardownLogic } from 'rxjs'
import { ExtDef, ExtTopo, Message, MsgID, Port, TopoNode, TopoPaths, TypeofPath } from '../../types'

export type SubcriptionPaths<Def extends ExtDef> = TopoPaths<Def, SubcriptionTopo<any, any>> & TopoPaths<Def>

export type SubcriptionReq<Def extends ExtDef, Path extends SubcriptionPaths<Def>> = TypeofPath<
  ExtTopo<Def>,
  Path
> extends SubcriptionTopo<infer Req, any>
  ? Req
  : never

export type SubcriptionVal<Def extends ExtDef, Path extends SubcriptionPaths<Def>> = TypeofPath<
  ExtTopo<Def>,
  Path
> extends SubcriptionTopo<any, infer Val>
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

export type SubcriptionTopo<SubReq, SubVal> = TopoNode<{
  sub: Port<'in', SubReqData<SubReq>>
  unsub: Port<'in', void /* |UnsubData */>
  unsubOut: Port<'out', UnsubData>
  item: Port<'out', ItemData<SubVal>>
}>

export type ValObsOf<SubTopo> = SubTopo extends SubcriptionTopo<any, infer Val> ? Observable<Val> : never
export type ValObsInputOf<SubTopo> = SubTopo extends SubcriptionTopo<any, infer Val> ? ObservableInput<Val> : never
export type ValOf<SubTopo> = SubTopo extends SubcriptionTopo<any, infer Val> ? Val : never
export type ProvidedValOf<SubTopo> =
  | ValObsInputOf<SubTopo>
  | ValOf<SubTopo>
  | [valObs$_or_valPromise_orVal: ValOf<SubTopo> | ValObsInputOf<SubTopo>, tearDownLogic?: TeardownLogic]

export type ValObsProviderOf<SubTopo> = SubTopo extends SubcriptionTopo<infer Req, any>
  ? (_: { req: Req; msg: Message }) => ProvidedValOf<SubTopo>
  : never
