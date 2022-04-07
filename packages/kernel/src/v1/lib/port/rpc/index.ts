import { Port as RawPort, PortShell } from '../../..'
import { TypeofPath, TypePaths } from '../../../../path'
import { ExtensionDef, PortsTopology } from '../../../extension'
import { Unlisten } from '../../../types'
import { listenPort } from '../listen'

// export type AsyncFn = () => Promise<any>
// export type AsyncFn<Arg extends any[] = any[], Val = any> = (...rpcTopoReqArgs: Arg) => Promise<Val>
export type RpcFn = (...rpcTopoReqArgs: any) => Promise<any>
// export type AsyncFn = (...rpcTopoReqArgs: any[]) => Promise<any>
export type RpcTopoPaths<Topo extends PortsTopology> = TypePaths<Topo, RpcTopo<RpcFn>>
export type ExtRpcTopoPaths<ExtDef extends ExtensionDef> = RpcTopoPaths<ExtDef['ports']>
export type ExtPathRpcFn<ExtDef extends ExtensionDef, Path extends ExtRpcTopoPaths<ExtDef>> = TypeofPath<
  ExtDef['ports'],
  Path
> extends RpcTopo<infer Afn>
  ? Afn
  : never
export type RpcFnOf<T> = T extends RpcTopo<infer Afn> ? Afn : never

export type RpcTopoRequestPort<Afn extends RpcFn> = RawPort<{ rpcTopoReqArgs: Parameters<Afn> }>
export type RpcTopoResponsePort<Afn extends RpcFn> = RawPort<
  { rpcTopoRespValue: Awaited<ReturnType<Afn>> } | { rpcTopoRespError: any }
>

export type RpcTopo<Afn extends RpcFn> = {
  rpcTopoRequest: RpcTopoRequestPort<Afn>
  rpcTopoResponse: RpcTopoResponsePort<Afn>
  // _________________?: RawPort<Afn>
}

export type RpcTopoFnOf<T> = (shell: PortShell<{ rpcTopoReqArgs: Parameters<RpcFnOf<T>> }>) => RpcFnOf<T>

export const reply =
  <Ext extends ExtensionDef>(shell: PortShell) =>
  <Path extends ExtRpcTopoPaths<Ext>>(pointer: `${Ext['name']}::${Path}`) =>
  (afnPort: RpcTopoFnOf<TypeofPath<Ext['ports'], Path>>) => {
    const [extName, path] = pointer.split('::') as [Ext['name'], Path]
    const { requestPath, responsePath } = rpc_paths(path)
    return listenPort({
      extName,
      path: requestPath,
      shell,
      listener: async requestListenerShell => {
        const afn = afnPort(requestListenerShell as any)
        const respond = requestListenerShell.push(extName)(responsePath)
        try {
          const rpcTopoRespValue = await afn(...(requestListenerShell.message.payload as any).rpcTopoReqArgs)
          respond({ rpcTopoRespValue } as any)
        } catch (rpcTopoRespError) {
          respond({ rpcTopoRespError } as any)
        }
      },
    })
  }

export const replyAll = <Ext extends ExtensionDef>(
  shell: PortShell,
  extName: Ext['name'],
  handles: {
    [Path in ExtRpcTopoPaths<Ext>]: RpcTopoFnOf<TypeofPath<Ext['ports'], Path>>
  },
) =>
  Object.entries(handles).reduce(
    (__, [path, port]) => {
      const fullPath = `${extName}::${path}`
      return {
        ...__,
        [fullPath]: reply(shell)(fullPath as any)(port as any),
      }
    },
    {} as {
      [Path in ExtRpcTopoPaths<Ext>]: Unlisten
    },
  )

export const ext =
  <ExtDef extends ExtensionDef>(shell: PortShell, extName: ExtDef['name']) =>
  <Path extends ExtRpcTopoPaths<ExtDef>>(path: Path) =>
    call<ExtDef>(shell)<Path>(`${extName}::${path}`)

export const call =
  <Ext extends ExtensionDef>(shell: PortShell) =>
  <Path extends ExtRpcTopoPaths<Ext>>(pointer: `${Ext['name']}::${Path}`): RpcFnOf<TypeofPath<Ext['ports'], Path>> => {
    const [extName, path]: any[] = pointer.split('::')
    return ((...rpcTopoReqArgs: any[]) =>
      new Promise((resolve, reject) => {
        const { requestPath, responsePath } = rpc_paths(path)
        const requestPayload = { rpcTopoReqArgs } as never
        const requestMessage = shell.push(extName)(requestPath)(requestPayload)
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
            const responsePayload = message.payload as any
            // console.log({ rpcResponse })
            'rpcTopoRespError' in responsePayload
              ? reject(responsePayload.rpcTopoRespError)
              : resolve(responsePayload.rpcTopoRespValue)
          },
        })
        return unsub
      })) as any
  }

function rpc_paths(base_path: string) {
  return {
    requestPath: `${base_path}.rpcTopoRequest`,
    responsePath: `${base_path}.rpcTopoResponse`,
  } as any
}
