import { Port as RawPort, PortShell } from '../../..'
import { TypeofPath, TypePaths } from '../../../../path'
import { ExtensionDef, ExtPointerPaths, Pointer, PortsTopology } from '../../../extension'
import { Unlisten } from '../../../types'
import { listenPort } from '../listen'

// export type AsyncFn = () => Promise<any>
// export type AsyncFn<Arg extends any[] = any[], Val = any> = (...asyncPortReqArgs: Arg) => Promise<Val>
export type AsyncFn = (...asyncPortReqArgs: any) => Promise<any>
// export type AsyncFn = (...asyncPortReqArgs: any[]) => Promise<any>
export type AsyncPortPaths<Topo extends PortsTopology> = TypePaths<Topo, AsyncPort<AsyncFn>>
export type ExtAsyncPortPaths<ExtDef extends ExtensionDef> = AsyncPortPaths<ExtDef['ports']>
export type ExtPathAsyncFn<ExtDef extends ExtensionDef, Path extends ExtAsyncPortPaths<ExtDef>> = TypeofPath<
  ExtDef['ports'],
  Path
> extends AsyncPort<infer Afn>
  ? Afn
  : never
export type AsyncFnOf<T> = T extends AsyncPort<infer Afn> ? Afn : never

export type AsyncPortRequestPort<Afn extends AsyncFn> = RawPort<{ asyncPortReqArgs: Parameters<Afn> }>
export type AsyncPortResponsePort<Afn extends AsyncFn> = RawPort<
  { asyncPortRespValue: Awaited<ReturnType<Afn>> } | { asyncPortRespError: any }
>

export type AsyncPort<Afn extends AsyncFn> = {
  asyncPortRequest: AsyncPortRequestPort<Afn>
  asyncPortResponse: AsyncPortResponsePort<Afn>
  _________________?: RawPort<Afn>
}

export type AsyncPortFnOf<T> = (shell: PortShell<{ asyncPortReqArgs: Parameters<AsyncFnOf<T>> }>) => AsyncFnOf<T>

export const handle =
  <Ext extends ExtensionDef>(
    shell: PortShell,
    ...pointer: Pointer<Ext, AsyncPort<any>, ExtPointerPaths<Ext, AsyncPort<any>>>
  ) =>
  (afnPort: AsyncPortFnOf<typeof pointer[1]>) => {
    const [extName, path]: any[] = pointer[0].split('::')
    return asyncRespond({ extName, shell })({ afnPort: afnPort as any, path })
  }

export const handleAll = <Ext extends ExtensionDef>(
  shell: PortShell,
  extName: Ext['name'],
  handles: {
    [Path in ExtAsyncPortPaths<Ext>]: AsyncPortFnOf<TypeofPath<Ext['ports'], Path>>
  },
) =>
  Object.entries(handles).reduce(
    (__, [path, port]) => {
      const fullPath = `${extName}::${path}`
      return {
        ...__,
        [fullPath]: handle(shell, fullPath as any)(port as any),
      }
    },
    {} as {
      [Path in ExtAsyncPortPaths<Ext>]: Unlisten
    },
  )

export const asyncRespond =
  <ExtDef extends ExtensionDef>({ extName, shell }: { shell: PortShell; extName: ExtDef['name'] }) =>
  <Path extends ExtAsyncPortPaths<ExtDef>, Afn extends ExtPathAsyncFn<ExtDef, Path> = ExtPathAsyncFn<ExtDef, Path>>({
    path,
    afnPort,
  }: {
    path: Path
    afnPort(shell: PortShell<{ asyncPortReqArgs: Parameters<Afn> }>): Afn
  }) => {
    const { requestPath, responsePath } = paths(path)
    return listenPort({
      extName,
      path: requestPath,
      shell,
      listener: async requestListenerShell => {
        const afn = afnPort(requestListenerShell as any)
        // console.log({ payload: requestListenerShell.message.payload })
        try {
          const asyncPortRespValue = await afn((requestListenerShell.message.payload as any).asyncPortReqArgs)
          requestListenerShell.push(extName, responsePath, { asyncPortRespValue } as any)
        } catch (asyncPortRespError) {
          requestListenerShell.push(extName, responsePath, { asyncPortRespError } as any)
        }
      },
    })
  }

export type AsyncRequest = <ExtDef extends ExtensionDef>(_: {
  shell: PortShell
  extName: ExtDef['name']
}) => <
  Path extends ExtAsyncPortPaths<ExtDef>,
  Afn extends ExtPathAsyncFn<ExtDef, Path> = ExtPathAsyncFn<ExtDef, Path>,
>(_: {
  path: Path
}) => Afn
export const asyncRequest: AsyncRequest =
  ({ extName, shell }) =>
  ({ path }) =>
    asyncFn(shell, `${extName}::${path}`)

export const asyncFn = <Ext extends ExtensionDef>(
  shell: PortShell,
  ...pointer: Pointer<Ext, AsyncPort<any>, ExtPointerPaths<Ext, AsyncPort<any>>>
): AsyncFnOf<typeof pointer[1]> => {
  const [extName, path]: any[] = pointer[0].split('::')
  return ((asyncPortReqArgs: never) =>
    new Promise((resolve, reject) => {
      const { requestPath, responsePath } = paths(path)
      const payload = { asyncPortReqArgs } as never // ^^'
      const requestMessage = shell.push(extName, requestPath, payload)
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
    })) as any
}

function paths(path: string) {
  return {
    requestPath: `${path}.asyncPortRequest`,
    responsePath: `${path}.asyncPortResponse`,
  } as any
}
// export const invoke = <A extends AsyncFn>(
//   shell: PortShell<any>,
//   rrGates: any, //AsyncShellGatesTopo<Arg, Val, A>,
// ): A =>
//   ((asyncPortReqArgs: any /* Arg */) =>
//     new Promise((resolve, reject) => {
//       const reqMsg = rrGates.request({ payload: { asyncPortReqArgs } })
//       const unsub = shell.listen(({ message: respMsg }) => {
//         if (respMsg.parentMsgId !== reqMsg.id) {
//           return
//         }
//         unsub()
//         'error' in respMsg.payload ? reject(respMsg.payload.error) : resolve(respMsg.payload.asyncPortRespValue)
//       })
//     })) as any as A
