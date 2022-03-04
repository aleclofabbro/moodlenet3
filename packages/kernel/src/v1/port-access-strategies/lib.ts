import { GatesTopology, Port, PortShell, ShellGatesTopology } from '..'

export type ReqResPortTopo<Req, Res> = {
  request: Port<Req>
  response: Port<Res>
}
export type ReqResGatesTopo<Req, Res> = GatesTopology<ReqResPortTopo<Req, Res>>
export type ReqResShellGatesTopo<Req, Res> = ShellGatesTopology<
  ReqResGatesTopo<Req, Res>
>

export const isReqResShellGatesTopo = (
  _: any
): _ is ReqResShellGatesTopo<any, any> =>
  !!_ && 'request' in _ && 'response' in _ //TODO: so trivial ^^'

type Api<Req, Res> = (req: Req) => Promise<Res>

export const reqResPort = <Req, Res>(
  api: Api<Req, Res>
): ReqResPortTopo<Req, Res> => ({
  async request(shell) {
    const respPath = shell.cwAddress.path.slice(0, -1).concat('response')
    const resp = await api(shell.message.payload)
    shell.push({ ...shell.cwAddress, path: respPath }, resp)
  },
  response() {},
})

export const invoke =
  <Req, Res>(
    shell: PortShell<any>,
    rrGates: ReqResShellGatesTopo<Req, Res>
  ): Api<Req, Res> =>
  (payload) =>
    new Promise((resolve, _reject) => {
      const reqMsg = rrGates.request({ payload })
      const unsub = shell.listen(({ message: respMsg }) => {
        if (respMsg.parentMsgId !== reqMsg.id) {
          return
        }
        resolve(respMsg.payload)
        unsub()
      })
    })
