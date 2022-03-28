import { Port as RawPort, PortShell } from '../../..'
import { TypeofPath, TypePaths } from '../../../../path'
import { ExtensionDef, PortsTopology } from '../../../extension'
import { Unlisten } from '../../../types'
import { listenPort } from '../listen'

// export type AsyncFn = () => Promise<any>
// export type AsyncFn<Arg extends any[] = any[], Val = any> = (...rpcPortReqArgs: Arg) => Promise<Val>
export type RpcFn = (...rpcPortReqArgs: any) => Promise<any>
// export type AsyncFn = (...rpcPortReqArgs: any[]) => Promise<any>
export type RpcPortPaths<Topo extends PortsTopology> = TypePaths<Topo, RpcPort<RpcFn>>
export type ExtRpcPortPaths<ExtDef extends ExtensionDef> = RpcPortPaths<ExtDef['ports']>
export type ExtPathRpcFn<ExtDef extends ExtensionDef, Path extends ExtRpcPortPaths<ExtDef>> = TypeofPath<
  ExtDef['ports'],
  Path
> extends RpcPort<infer Afn>
  ? Afn
  : never
export type RpcFnOf<T> = T extends RpcPort<infer Afn> ? Afn : never

export type RpcPortRequestPort<Afn extends RpcFn> = RawPort<{ rpcPortReqArgs: Parameters<Afn> }>
export type RpcPortResponsePort<Afn extends RpcFn> = RawPort<
  { rpcPortRespValue: Awaited<ReturnType<Afn>> } | { rpcPortRespError: any }
>

export type RpcPort<Afn extends RpcFn> = {
  rpcPortRequest: RpcPortRequestPort<Afn>
  rpcPortResponse: RpcPortResponsePort<Afn>
  _________________?: RawPort<Afn>
}

export type RpcPortFnOf<T> = (shell: PortShell<{ rpcPortReqArgs: Parameters<RpcFnOf<T>> }>) => RpcFnOf<T>

export const rpcReply =
  <Ext extends ExtensionDef>(shell: PortShell) =>
  <Path extends ExtRpcPortPaths<Ext>>(pointer: `${Ext['name']}::${Path}`) =>
  (afnPort: RpcPortFnOf<TypeofPath<Ext['ports'], Path>>) => {
    const [extName, path] = pointer.split('::') as [Ext['name'], Path]
    return ___remove_me___asyncRespond<Ext>({ extName, shell })<Path>({ afnPort: afnPort as any, path: path as any })
  }

export const rpcReplyAll = <Ext extends ExtensionDef>(
  shell: PortShell,
  extName: Ext['name'],
  handles: {
    [Path in ExtRpcPortPaths<Ext>]: RpcPortFnOf<TypeofPath<Ext['ports'], Path>>
  },
) =>
  Object.entries(handles).reduce(
    (__, [path, port]) => {
      const fullPath = `${extName}::${path}`
      return {
        ...__,
        [fullPath]: rpcReply(shell)(fullPath as any)(port as any),
      }
    },
    {} as {
      [Path in ExtRpcPortPaths<Ext>]: Unlisten
    },
  )

export const ___remove_me___asyncRespond =
  <ExtDef extends ExtensionDef>({ extName, shell }: { shell: PortShell; extName: ExtDef['name'] }) =>
  <Path extends ExtRpcPortPaths<ExtDef>, Afn extends ExtPathRpcFn<ExtDef, Path> = ExtPathRpcFn<ExtDef, Path>>({
    path,
    afnPort,
  }: {
    path: Path
    afnPort(shell: PortShell<{ rpcPortReqArgs: Parameters<Afn> }>): Afn
  }) => {
    const { requestPath, responsePath } = rpc_paths(path)
    return listenPort({
      extName,
      path: requestPath,
      shell,
      listener: async requestListenerShell => {
        const afn = afnPort(requestListenerShell as any)
        try {
          const rpcPortRespValue = await afn(...(requestListenerShell.message.payload as any).rpcPortReqArgs)
          requestListenerShell.push(extName, responsePath, { rpcPortRespValue } as any)
        } catch (rpcPortRespError) {
          requestListenerShell.push(extName, responsePath, { rpcPortRespError } as any)
        }
      },
    })
  }

export type RpcRequest = <ExtDef extends ExtensionDef>(_: {
  shell: PortShell
  extName: ExtDef['name']
}) => <Path extends ExtRpcPortPaths<ExtDef>, Afn extends ExtPathRpcFn<ExtDef, Path> = ExtPathRpcFn<ExtDef, Path>>(_: {
  path: Path
}) => Afn

export const ____remove_me__asyncRequest =
  <ExtDef extends ExtensionDef>({ extName, shell }: { shell: PortShell; extName: ExtDef['name'] }) =>
  <Path extends ExtRpcPortPaths<ExtDef>>({ path }: { path: Path }) =>
    rpcRequest<ExtDef>(shell)<Path>(`${extName}::${path}`)

export const rpcRequest =
  <Ext extends ExtensionDef>(shell: PortShell) =>
  <Path extends ExtRpcPortPaths<Ext>>(pointer: `${Ext['name']}::${Path}`): RpcFnOf<TypeofPath<Ext['ports'], Path>> => {
    const [extName, path]: any[] = pointer.split('::')
    return ((rpcPortReqArgs: never) =>
      new Promise((resolve, reject) => {
        const { requestPath, responsePath } = rpc_paths(path)
        const payload = { rpcPortReqArgs } as never // ^^'
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
            const rpcResponse = message.payload as any
            // console.log({ rpcResponse })
            if ('rpcPortRespError' in rpcResponse) {
              reject(rpcResponse.rpcPortRespError)
            } else {
              resolve(rpcResponse.rpcPortRespValue)
            }
          },
        })
        return unsub
      })) as any
  }

function rpc_paths(base_path: string) {
  return {
    requestPath: `${base_path}.rpcPortRequest`,
    responsePath: `${base_path}.rpcPortResponse`,
  } as any
}
