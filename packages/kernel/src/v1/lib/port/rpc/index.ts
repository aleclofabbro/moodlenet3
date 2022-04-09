import type { Port, PortShell } from '../../..'
import type { TypeofPath } from '../../../../path'
import type { ExtensionDef, ExtId, ExtTopoPaths, Pointer, TopoNode } from '../../../extension'
import { joinPointer, splitPointer } from '../../../extension'
import type { Unlisten } from '../../../types'
import * as listen from '../listen'

export declare const RPC_TOPO_SYM: symbol
export type RPC_TOPO_SYM = typeof RPC_TOPO_SYM
// export type AsyncFn = () => Promise<any>
// export type AsyncFn<Arg extends any[] = any[], Val = any> = (...rpcTopoReqArgs: Arg) => Promise<Val>
export type RpcFn = (...rpcTopoReqArgs: any) => Promise<any>
// export type AsyncFn = (...rpcTopoReqArgs: any[]) => Promise<any>
//export type RpcTopoPaths<Topo extends Topology> = TopoPaths<Topo, RPC_TOPO_SYM>

export type ExtRpcTopoPaths<ExtDef extends ExtensionDef> = ExtTopoPaths<ExtDef, RpcTopo<RpcFn>> & ExtTopoPaths<ExtDef>
export type ExtPathRpcFn<ExtDef extends ExtensionDef, Path extends ExtRpcTopoPaths<ExtDef>> = TypeofPath<
  ExtDef['ports'],
  Path
> extends RpcTopo<infer Afn>
  ? Afn
  : never

export type RpcFnOf<T> = T extends RpcTopo<infer Afn> ? Afn : never

export type RpcTopoRequestPort<Afn extends RpcFn> = Port<{ rpcTopoReqArgs: Parameters<Afn> }>
export type RpcTopoResponsePort<Afn extends RpcFn> = Port<
  { rpcTopoRespValue: Awaited<ReturnType<Afn>> } | { rpcTopoRespError: any }
>

export type RpcTopo<Afn extends RpcFn> = TopoNode<
  RPC_TOPO_SYM,
  {
    rpcTopoRequest: RpcTopoRequestPort<Afn>
    rpcTopoResponse: RpcTopoResponsePort<Afn>
    // _________________?: RawPort<Afn>
  }
>

export type RpcTopoFnOf<T> = (shell: PortShell<{ rpcTopoReqArgs: Parameters<RpcFnOf<T>> }>) => RpcFnOf<T>

export const reply =
  <Ext extends ExtensionDef>(shell: PortShell) =>
  <Path extends ExtRpcTopoPaths<Ext>>(pointer: Pointer<Ext, Path>) =>
  (afnPort: RpcTopoFnOf<TypeofPath<Ext['ports'], Path>>) => {
    const { /* requestPointer, */ responsePointer } = rpc_pointers<Ext, Path>(pointer)
    return listen.port(shell)(pointer, async requestListenerShell => {
      const afn = afnPort(requestListenerShell as any)
      const { extId, path } = splitPointer(responsePointer)
      const respond = requestListenerShell.push(extId)(path)
      try {
        const rpcTopoRespValue = await afn(...(requestListenerShell.message.payload as any).rpcTopoReqArgs)
        respond({ rpcTopoRespValue } as any)
      } catch (rpcTopoRespError) {
        respond({ rpcTopoRespError } as any)
      }
    })
  }

export const replyAll = <Ext extends ExtensionDef>(
  shell: PortShell,
  extId: ExtId<Ext>,
  handles: {
    [Path in ExtRpcTopoPaths<Ext>]: RpcTopoFnOf<TypeofPath<Ext['ports'], Path>>
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
      [Path in ExtRpcTopoPaths<Ext>]: Unlisten
    },
  )

export const ext =
  <Ext extends ExtensionDef>(shell: PortShell, extId: ExtId<Ext>) =>
  <Path extends ExtRpcTopoPaths<Ext>>(path: Path) => {
    const fullPath = joinPointer(extId, path) as never

    return caller(shell)(fullPath)
  }

export const caller =
  <Ext extends ExtensionDef>(shell: PortShell) =>
  <Path extends ExtRpcTopoPaths<Ext>>(pointer: Pointer<Ext, Path>): RpcFnOf<TypeofPath<Ext['ports'], Path>> => {
    const { requestPointer, responsePointer } = rpc_pointers<Ext, Path>(pointer)
    return ((...rpcTopoReqArgs: any[]) =>
      new Promise((resolve, reject) => {
        const requestPayload = { rpcTopoReqArgs } as never
        const { extId, path } = splitPointer(requestPointer)
        const requestMessage = shell.push(extId)(path)(requestPayload)
        const unsub = listen.port(shell)(responsePointer, responseListenerShell => {
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
        })
        return unsub
      })) as any
  }

const rpc_pointers = <Ext extends ExtensionDef, Path extends ExtRpcTopoPaths<Ext>>(pointer: Pointer<Ext, Path>) => ({
  requestPointer: `${pointer}/rpcTopoRequest` as `${Pointer<Ext, Path>}/rpcTopoRequest`,
  responsePointer: `${pointer}/rpcTopoResponse` as `${Pointer<Ext, Path>}/rpcTopoResponse`,
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
//     a: RpcTopo<C>
//     s: {
//       g: Port<11>
//       v: {
//         l: Port<string>
//         a: RpcTopo<C>
//       }
//     }
//   }
// >
// declare const s: any

// listen.port<D>(s)('xxxx@1.4.3::s.v.l', ({ message: { payload } }) => {})
// listen.ext<D>(s, 'xxxx@1.4.3')('s.g', ({ message: { payload } }) => {})
// type C = <T>(t: T) => Promise<{ _: T }>

// const g = caller<D>(s)('xxxx@1.4.3::s.v.a')(100)

// const j: ExtRpcTopoPaths<D> = 's.v.a'
