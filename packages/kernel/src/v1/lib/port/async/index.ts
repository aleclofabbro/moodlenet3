import { GatesTopology, Port, PortShell, ShellGatesTopology } from '../../..'

type AsyncFn<Arg, Val> = (asyncPortReqArg: Arg) => Promise<Val>

export type AsyncPortTopo<Arg, Val, _A extends AsyncFn<Arg, Val>> = {
  request: Port<{ asyncPortReqArg: Arg }>
  response: Port<{ asyncPortRespValue: Val } | { error: any }>
}
export type AsyncGatesTopo<Arg, Val, A extends AsyncFn<Arg, Val>> = GatesTopology<AsyncPortTopo<Arg, Val, A>>
export type AsyncShellGatesTopo<Arg, Val, A extends AsyncFn<Arg, Val>> = ShellGatesTopology<AsyncGatesTopo<Arg, Val, A>>

export const isAsyncShellGatesTopo = <Arg, Val>(_: any): _ is AsyncShellGatesTopo<Arg, Val, AsyncFn<Arg, Val>> =>
  !!_ && 'request' in _ && 'response' in _ //TODO: so trivial ^^'

export type AsyncPort<Arg, Val, A extends AsyncFn<Arg, Val>> = (shell: PortShell<{ asyncPortReqArg: Arg }>) => A
export const asyncPort = <A extends AsyncFn<Arg, Val>, Arg = any, Val = any>(
  asyncPort: AsyncPort<Arg, Val, A>,
): AsyncPortTopo<Arg, Val, A> => ({
  async request(shell) {
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

export const invoke = <Arg, Val, A extends AsyncFn<Arg, Val>>(
  shell: PortShell<any>,
  rrGates: AsyncShellGatesTopo<Arg, Val, A>,
): A =>
  ((asyncPortReqArg: Arg) =>
    new Promise((resolve, reject) => {
      const reqMsg = rrGates.request({ payload: { asyncPortReqArg } })
      const unsub = shell.listen(({ message: respMsg }) => {
        if (respMsg.parentMsgId !== reqMsg.id) {
          return
        }
        'error' in respMsg.payload ? reject(respMsg.payload.error) : resolve(respMsg.payload.asyncPortRespValue)
        unsub()
      })
    })) as any as A

// type Def = typeof def
// const def = {
//   name: '@moodlenet/pri-http',
//   version: '1.0.0',
//   ports: {
//     activate: ExtPort({}, async (shell) => {
//       const _this = shell.lookup<Def>('@moodlenet/pri-http')!

//       const x = await invoke(shell, _this.gates.a.b)({ t: '12', k: 10 })
//       x.kk.___
//       x.tt.___
//     }),
//     deactivate() {},
//     a: {
//       b: asyncPort((__) => async <T, K>(a: { t: T; k: K }) => ({
//         _: __.message.target,
//         tt: { ___: a.t },
//         kk: { ___: a.k },
//       })),
//     },
//   },
// } as const
// type AA = <T, K>(a: {
//   t: T
//   k: K
// }) => Promise<{
//   _: PortAddress
//   tt: ZZ<T>
//   kk: ZZ<K>
// }>
// type ZZ<T> = { ___: T }

// type Wrapper<AFN extends AsyncFunction> = (x: string) => AFN
// type Unwrapped<P extends Wrapper<AsyncFunction>> = P extends Wrapper<infer AFN>
//   ? AFN
//   : never
// declare const x: Unwrapped<(c: string) => <T>(d: T) => Promise<[T, string]>>

// ;async () => {
//   const y = await x({ a: 1 })
// }
