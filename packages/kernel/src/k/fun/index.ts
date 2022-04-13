import type {
  ExtDef,
  ExtId,
  ExtTopoPaths,
  Message,
  Pointer,
  Port,
  PortShell,
  TopoNode,
  TypeofPath,
  Unlisten,
} from '../../types'
import { joinPointer, splitPointer } from '../pointer'
import * as probe from '../probe'

// export declare const FUN_TOPO_SYM: symbol
// export type FUN_TOPO_SYM = typeof FUN_TOPO_SYM
export type Fun = (...funTopoReqArgs: any) => any

export type ExtFunTopoPaths<Def extends ExtDef> = ExtTopoPaths<Def, FunTopo<Fun>> & ExtTopoPaths<Def>
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

export type FunTopo<Fn extends Fun> = TopoNode<// FUN_TOPO_SYM,
{
  funTopoRequest: FunTopoRequestPort<Fn>
  funTopoResponse: FunTopoResponsePort<Fn>
  // _________________?: RawPort<Fn>
}>

export type FunTopoFnOf<T> = (shell: PortShell<{ funTopoReqArgs: Parameters<FunOf<T>> }>) => FunOf<T>

export const retrn =
  <Ext extends ExtDef>(shell: PortShell) =>
  <Path extends ExtFunTopoPaths<Ext>>(pointer: Pointer<Ext, Path>) =>
  (funPort: FunTopoFnOf<TypeofPath<Ext['ports'], Path>>) => {
    const { /* requestPointer, */ responsePointer } = fun_pointers<Ext, Path>(pointer)
    return probe.probePort(shell)(pointer, requestListenerShell => {
      const fun = funPort(requestListenerShell as any)
      const { extId, path } = splitPointer(responsePointer)
      const respond = requestListenerShell.push(extId)(path)
      const respondSuccess = (funTopoRespError: any) => respond({ funTopoRespError } as any)
      const respondError = (funTopoRespValue: any) => respond({ funTopoRespValue } as any)
      try {
        const funTopoRespValue = fun(...(requestListenerShell.message.payload as any).funTopoReqArgs)
        respondSuccess(funTopoRespValue)
      } catch (funTopoRespError) {
        respondError(funTopoRespError)
      }
    })
  }

export const retrnAll = <Ext extends ExtDef>(
  shell: PortShell,
  extId: ExtId<Ext>,
  handles: {
    [Path in ExtFunTopoPaths<Ext>]: FunTopoFnOf<TypeofPath<Ext['ports'], Path>>
  },
) =>
  Object.entries(handles).reduce(
    (__, [path, port]) => {
      const fullPath = joinPointer(extId, path) as never
      return {
        ...__,
        [fullPath]: retrn(shell)(fullPath)(port as any),
      }
    },
    {} as {
      [Path in ExtFunTopoPaths<Ext>]: Unlisten
    },
  )

export const extInvoke =
  <Ext extends ExtDef>(shell: PortShell, extId: ExtId<Ext>) =>
  <Path extends ExtFunTopoPaths<Ext>>(path: Path) => {
    const fullPath = joinPointer(extId, path) as never

    return invoke(shell)(fullPath)
  }

export const invoke =
  <Ext extends ExtDef>(shell: PortShell) =>
  <Path extends ExtFunTopoPaths<Ext>>(pointer: Pointer<Ext, Path>): FunOf<TypeofPath<Ext['ports'], Path>> => {
    const { requestPointer, responsePointer } = fun_pointers<Ext, Path>(pointer)
    return ((...funTopoReqArgs: any[]) => {
      const requestPayload = { funTopoReqArgs } as never
      const { extId, path } = splitPointer(requestPointer)
      let returnMessage: Message<any> | null = null
      const _throw = (e: any) => {
        throw e
      }
      const unsub = probe.probePort(shell)(
        responsePointer,
        responseListenerShell => {
          const message = responseListenerShell.message
          if (message.parentMsgId !== invokeMessage.id) {
            return
          }
          returnMessage = message
          unsub()
        },
        { consume: true },
      )

      const invokeMessage = shell.push(extId)(path)(requestPayload)
      if (!invokeMessage.consumedBy) {
        const msg = `invoking fun ${pointer}, message not consumed:\n${JSON.stringify(invokeMessage)}`
        return _throw(new Error(msg)) //TODO: define standard `Error`s & codes
      }
      if (!returnMessage) {
        const msg = `invoking fun ${pointer}, no returnMessage received:\n${JSON.stringify(invokeMessage)}`
        return _throw(new Error(msg)) //TODO: define standard `Error`s & codes
      }
      const returnPayload = (returnMessage as Message<any>).payload

      if ('funTopoRespError' in returnPayload) {
        return _throw(returnPayload.funTopoRespError)
      }
      return returnPayload.funTopoRespValue
    }) as any
  }

const fun_pointers = <Ext extends ExtDef, Path extends ExtFunTopoPaths<Ext>>(pointer: Pointer<Ext, Path>) => ({
  requestPointer: `${pointer}/funTopoRequest` as `${Pointer<Ext, Path>}/funTopoRequest`,
  responsePointer: `${pointer}/funTopoResponse` as `${Pointer<Ext, Path>}/funTopoResponse`,
})

/*
 *
 *
 *
 */

// type D = ExtensionDef<
//   'xxxx',
//   '1.4.3',
//   {
//     d: RpcTopo<Q>
//     a: FunTopo<C>
//     s: {
//       g: Port<11>
//       v: {
//         l: Port<string>
//         a: FunTopo<C>
//       }
//     }
//   }
// >
// declare const s: any

// type C = <T>(t: T) => { _: T }
// type Q = <T>(_: T) =>Promise< { QQ: T }>

// const g = invoke<D>(s)('xxxx@1.4.3::a')(100)
// const x = call<D>(s)('xxxx@1.4.3::d')(100)

// const j: ExtFunTopoPaths<D> = 's/v/a'
