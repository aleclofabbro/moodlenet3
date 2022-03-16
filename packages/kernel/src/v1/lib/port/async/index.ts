import { Opaque } from 'type-fest'
import { Port, PortShell } from '../../..'

type AsyncFn<Args extends any[] = any[], Val = any> = (...asyncPortReqArgs: Args) => Promise<Val>

export type AsyncPortTopo<AFn extends AsyncFn> = Opaque<{
  asyncPortRequest: Port<{ asyncPortReqArgs: Parameters<AFn> }>
  asyncPortResponse: Port<{ asyncPortRespValue: Awaited<ReturnType<AFn>> } | { error: any }>
}>

export const asyncPort = <A extends AsyncFn>(
  asyncPort: any, //AsyncPort<Arg, Val, A>,
) /* : AsyncPortTopo<Arg, Val, A> */ => ({
  async request(shell: any) {
    const respPath = shell.cwAddress.path.slice(0, -1).concat('response')
    try {
      const asyncPortRespValue = await asyncPort(shell)(shell.message.payload.asyncPortReqArg)
      shell.push({ extId: shell.cwAddress.extId, path: respPath }, { asyncPortRespValue })
    } catch (error) {
      shell.push({ extId: shell.cwAddress.extId, path: respPath }, { error })
    }
  },
  response() {},
})

export const invoke = <A extends AsyncFn>(
  shell: PortShell<any>,
  rrGates: any, //AsyncShellGatesTopo<Arg, Val, A>,
): A =>
  ((asyncPortReqArg: any /* Arg */) =>
    new Promise((resolve, reject) => {
      const reqMsg = rrGates.request({ payload: { asyncPortReqArg } })
      const unsub = shell.listen(({ message: respMsg }) => {
        if (respMsg.parentMsgId !== reqMsg.id) {
          return
        }
        unsub()
        'error' in respMsg.payload ? reject(respMsg.payload.error) : resolve(respMsg.payload.asyncPortRespValue)
      })
    })) as any as A
