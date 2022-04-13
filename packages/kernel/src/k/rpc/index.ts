import type { ExtDef, ExtId, ExtTopoPaths, Pointer, Port, PortShell, TopoNode, TypeofPath, Unlisten } from '../../types'
import { joinPointer, splitPointer } from '../pointer'
import * as probe from '../probe'

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

export type RpcTopo<Afn extends RpcFn> = TopoNode<// RPC_TOPO_SYM,
{
  rpcTopoRequest: RpcTopoRequestPort<Afn>
  rpcTopoResponse: RpcTopoResponsePort<Afn>
  // _________________?: RawPort<Afn>
}>

export type RpcTopoFnOf<T> = (shell: PortShell<{ rpcTopoReqArgs: Parameters<RpcFnOf<T>> }>) => RpcFnOf<T>

export const reply =
  <Def extends ExtDef>(shell: PortShell) =>
  <Path extends ExtRpcTopoPaths<Def>>(pointer: Pointer<Def, Path>) =>
  (afnPort: RpcTopoFnOf<TypeofPath<Def['ports'], Path>>) => {
    const { /* requestPointer, */ responsePointer } = rpc_pointers<Def, Path>(pointer)
    return probe.probePort(shell)(pointer, async requestListenerShell => {
      const afn = afnPort(requestListenerShell as any)
      const { extId, path } = splitPointer(responsePointer)
      const respond = requestListenerShell.push(extId)(path)
      const respondSuccess = (rpcTopoRespError: any) => respond({ rpcTopoRespError } as any)
      const respondError = (rpcTopoRespValue: any) => respond({ rpcTopoRespValue } as any)
      try {
        const rpcTopoRespValue = await afn(...(requestListenerShell.message.payload as any).rpcTopoReqArgs)
        respondSuccess(rpcTopoRespValue)
      } catch (rpcTopoRespError) {
        respondError(rpcTopoRespError)
      }
    })
  }

export const replyAll = <Def extends ExtDef>(
  shell: PortShell,
  extId: ExtId<Def>,
  handles: {
    [Path in ExtRpcTopoPaths<Def>]: RpcTopoFnOf<TypeofPath<Def['ports'], Path>>
  },
) =>
  Object.entries(handles).reduce(
    (__, [path, port]) => {
      const fullPath = joinPointer(extId, path) as never
      return {
        ...__,
        [fullPath]: reply(shell)(fullPath)(port as any),
      }
    },
    {} as {
      [Path in ExtRpcTopoPaths<Def>]: Unlisten
    },
  )

export const caller =
  <Def extends ExtDef>(shell: PortShell, extId: ExtId<Def>) =>
  <Path extends ExtRpcTopoPaths<Def>>(path: Path) => {
    const fullPath = joinPointer(extId, path) as never

    return call<Def>(shell)<Path>(fullPath)
  }

export const call =
  <Def extends ExtDef>(shell: PortShell) =>
  <Path extends ExtRpcTopoPaths<Def>>(pointer: Pointer<Def, Path>): RpcFnOf<TypeofPath<Def['ports'], Path>> => {
    const { requestPointer, responsePointer } = rpc_pointers<Def, Path>(pointer)
    return ((...rpcTopoReqArgs: any[]) =>
      new Promise((resolve, reject) => {
        const requestPayload = { rpcTopoReqArgs } as never
        const { extId, path } = splitPointer(requestPointer)
        const requestMessage = shell.push(extId)(path)(requestPayload)
        if (!requestMessage.consumedBy) {
          const msg = `calling rpc ${pointer}, message not consumed:\n${JSON.stringify(requestMessage)}`
          reject({ msg, errorCode: 'NOT_CONSUMED' }) //TODO: define standard errors/codes
          return
        }
        const unsub = probe.probePort(shell)(
          responsePointer,
          responseListenerShell => {
            const message = responseListenerShell.message
            if (message.parentMsgId !== requestMessage.id) {
              return
            }
            unsub()
            const responsePayload = message.payload as any
            // console.log({ rpcResponse })
            'rpcTopoRespError' in responsePayload
              ? reject(responsePayload.rpcTopoRespError)
              : resolve(responsePayload.rpcTopoRespValue)
          },
          { consume: true },
        )
        return unsub
      })) as any
  }

const rpc_pointers = <Def extends ExtDef, Path extends ExtRpcTopoPaths<Def>>(pointer: Pointer<Def, Path>) => ({
  requestPointer: `${pointer}/rpcTopoRequest` as `${Pointer<Def, Path>}/rpcTopoRequest`,
  responsePointer: `${pointer}/rpcTopoResponse` as `${Pointer<Def, Path>}/rpcTopoResponse`,
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
//     d: Port<string>
//     a: RpcTopo<Q>
//     s: {
//       g: Port<11>
//       v: {
//         l: Port<string>
//         a: RpcTopo<Q>
//       }
//       // a: FunTopo<C>
//     }
//   }
// >
// declare const s: any

// type C = <T>(t: T) => { _: T }
// type Q = <T>(t: T) => Promise<{ _: T }>

// const g = call<D>(s)('xxxx@1.4.3::s/v/a')('1002')

// const j: ExtRpcTopoPaths<D> = 's/v/a'
// listen.port<D>(s)('xxxx@1.4.3::s.v.l', ({ message: { payload } }) => {})
// listen.ext<D>(s, 'xxxx@1.4.3')('s.g', ({ message: { payload } }) => {})
