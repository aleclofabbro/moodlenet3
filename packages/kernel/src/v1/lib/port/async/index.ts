import { Port as RawPort, PortShell } from '../../..'
import { TypeofPath, TypePaths } from '../../../../path'
import { ExtensionDef, PortsTopology } from '../../../extension'
import { listenPort } from '../listen'

export type AsyncFn<Args extends any[] = any[], Val = any> = (...asyncPortReqArgs: Args) => Promise<Val>
// export type AsyncFn = (...asyncPortReqArgs: any[]) => Promise<any>
export type AsyncPortPaths<Topo extends PortsTopology> = TypePaths<Topo, AsyncPort<AsyncFn>>
export type ExtAsyncPortPaths<ExtDef extends ExtensionDef> = AsyncPortPaths<ExtDef['ports']>
export type ExtPathAsyncFn<ExtDef extends ExtensionDef, Path extends ExtAsyncPortPaths<ExtDef>> = TypeofPath<
  ExtDef['ports'],
  Path
> extends AsyncPort<infer Afn>
  ? Afn
  : never

export type AsyncPortRequestPort<Afn extends AsyncFn> = RawPort<{ asyncPortReqArgs: Parameters<Afn> }>
export type AsyncPortResponsePort<Afn extends AsyncFn> = RawPort<
  { asyncPortRespValue: Awaited<ReturnType<Afn>> } | { asyncPortRespError: any }
>

export type AsyncPort<Afn extends AsyncFn> = {
  asyncPortRequest: AsyncPortRequestPort<Afn>
  asyncPortResponse: AsyncPortResponsePort<Afn>
}

export const asyncRespond =
  <ExtDef extends ExtensionDef>({ extName, shell }: { shell: PortShell; extName: ExtDef['name'] }) =>
  <Path extends ExtAsyncPortPaths<ExtDef>>({
    path,
    afnPort,
  }: {
    path: Path
    afnPort(shell: PortShell /* <Parameters<ExtPathAsyncFn<ExtDef, Path>>> */): ExtPathAsyncFn<ExtDef, Path>
  }) => {
    const requestPath = `${path}.asyncPortRequest` as any
    const responsePath = `${path}.asyncPortResponse` as any
    return listenPort({
      extName,
      path: requestPath,
      shell,
      listener: async requestListenerShell => {
        const afn = afnPort(requestListenerShell)
        // console.log({ payload: requestListenerShell.message.payload })
        try {
          const asyncPortRespValue = await afn(...(requestListenerShell.message.payload as any).asyncPortReqArgs)
          requestListenerShell.push(extName, responsePath, { asyncPortRespValue } as any)
        } catch (asyncPortRespError) {
          requestListenerShell.push(extName, responsePath, { asyncPortRespError } as any)
        }
      },
    })
  }
export const asyncRequest =
  <ExtDef extends ExtensionDef>({ extName, shell }: { shell: PortShell; extName: ExtDef['name'] }) =>
  <Path extends ExtAsyncPortPaths<ExtDef>>({ path }: { path: Path }) =>
    ((...asyncPortReqArgs) =>
      new Promise((resolve, reject) => {
        const requestPath = `${path}.asyncPortRequest` as any
        const responsePath = `${path}.asyncPortResponse` as any
        const requestMessage = shell.push(extName, requestPath, { asyncPortReqArgs } as any)
        const unsub = listenPort({
          extName,
          path: responsePath,
          shell,
          listener: responseListenerShell => {
            const message = responseListenerShell.message
            if (message.parentMsgId !== requestMessage.id) {
              return
            }
            unsub()
            const asyncResponse = message.payload as any
            // console.log({ asyncResponse })
            if ('asyncPortRespError' in asyncResponse) {
              reject(asyncResponse.asyncPortRespError)
            } else {
              resolve(asyncResponse.asyncPortRespValue)
            }
          },
        })
        return unsub
      })) as ExtPathAsyncFn<ExtDef, Path>

// export const invoke = <A extends AsyncFn>(
//   shell: PortShell<any>,
//   rrGates: any, //AsyncShellGatesTopo<Arg, Val, A>,
// ): A =>
//   ((asyncPortReqArg: any /* Arg */) =>
//     new Promise((resolve, reject) => {
//       const reqMsg = rrGates.request({ payload: { asyncPortReqArg } })
//       const unsub = shell.listen(({ message: respMsg }) => {
//         if (respMsg.parentMsgId !== reqMsg.id) {
//           return
//         }
//         unsub()
//         'error' in respMsg.payload ? reject(respMsg.payload.error) : resolve(respMsg.payload.asyncPortRespValue)
//       })
//     })) as any as A
