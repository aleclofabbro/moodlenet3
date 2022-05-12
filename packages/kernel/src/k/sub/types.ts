import { Observable, ObservableNotification, Subscription } from 'rxjs'
import { DataMessage, ExtDef, ExtTopo, Port, TopoNode, TopoPaths, TypeofPath } from '../../types'

export type SubcriptionPaths<Def extends ExtDef> = TopoPaths<Def, SubTopo<SubObsProviderDef>> & TopoPaths<Def>

export type SubcriptionReq<Def extends ExtDef, Path extends SubcriptionPaths<Def>> = ArgsOf<
  TypeofPath<ExtTopo<Def>, Path>
>

export type SubcriptionVal<Def extends ExtDef, Path extends SubcriptionPaths<Def>> = ValTypeOf<
  TypeofPath<ExtTopo<Def>, Path>
>
export type SubObsProviderDefOfTopo<Def extends ExtDef, Path extends SubcriptionPaths<Def>> = TypeofPath<
  ExtTopo<Def>,
  Path
> extends SubTopo<infer SP>
  ? SP
  : never

export type SubReqData<Args> = {
  args: Args
}

// export type UnsubData = {
//   id: MsgID
// }

export type ItemData<Val> = {
  item: ObservableNotification<Val>
}

export type SubObsProviderDef = (...subArgs: any) => any
export type SPArgs<SP extends SubObsProviderDef> = Parameters<SP>
export type SPValType<SP extends SubObsProviderDef> = ReturnType<SP>
export type SubTopo<SP extends SubObsProviderDef> = TopoNode<{
  sub: SubPort<SP>
  unsub: Port<'in', void /* |UnsubData */>
  // unsubOut: Port<'out', UnsubData>
  item: ItemPort<SP>
}>
export type SubPort<SP extends SubObsProviderDef> = Port<'in', SubReqData<SPArgs<SP>>>
export type ItemPort<SP extends SubObsProviderDef> = Port<'out', ItemData<SPValType<SP>>>

// export type ValItemOf<Topo> = { msg: IMessage<ItemData<ValTypeOf<Topo>>> }
export type SubMsgObsOf<Topo> = Topo extends SubTopo<infer SP>
  ? Observable<{ msg: DataMessage<ItemData<SPValType<SP>>> }>
  : never

export type ValPromiseOf<Topo> = Topo extends SubTopo<infer SP> ? Promise<{ msg: DataMessage<SPValType<SP>> }> : never
export type ValTypeOf<Topo> = Topo extends SubTopo<infer SP> ? SPValType<SP> : unknown
export type ArgsOf<Topo> = Topo extends SubTopo<infer SP> ? SPArgs<SP> : unknown[]
// export type ProvidedValOf<Topo> =Topo extends SubTopo<infer SP> ? SP:never
// | ProviderValObsInputOf<Topo>
// | [valObs: ProviderValObsInputOf<Topo>, tearDownLogic: TeardownLogic]

// export type ValObsTopoProviderOf<Topo> = Topo extends SubTopo ? ValObsTopoOf<Topo> : never
export type ValObsTopoProviderOf<Topo> = (
  mainSub: Subscription,
  msg: DataMessage<SubReqData<ArgsOf<Topo>>>,
) => Topo extends SubTopo<infer SP> ? SP : never
