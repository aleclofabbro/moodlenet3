import { GatesTopology, Port, PortShell, ShellGatesTopology } from '..'

type AsyncFn<Arg, Val> = (arg: Arg) => Promise<Val>

export type AsyncPortTopo<Arg, Val, _A extends AsyncFn<Arg, Val>> = {
  request: Port<{ arg: Arg }>
  response: Port<{ value: Val }>
}
export type AsyncGatesTopo<
  Arg,
  Val,
  A extends AsyncFn<Arg, Val>
> = GatesTopology<AsyncPortTopo<Arg, Val, A>>
export type AsyncShellGatesTopo<
  Arg,
  Val,
  A extends AsyncFn<Arg, Val>
> = ShellGatesTopology<AsyncGatesTopo<Arg, Val, A>>

export const isAsyncShellGatesTopo = <Arg, Val>(
  _: any
): _ is AsyncShellGatesTopo<Arg, Val, AsyncFn<Arg, Val>> =>
  !!_ && 'request' in _ && 'response' in _ //TODO: so trivial ^^'

export type AsyncPort<Arg, Val, A extends AsyncFn<Arg, Val>> = (
  shell: PortShell<{ arg: Arg }>
) => A
export const asyncPort = <A extends AsyncFn<Arg, Val>, Arg = any, Val = any>(
  asyncPort: AsyncPort<Arg, Val, A>
): AsyncPortTopo<Arg, Val, A> => ({
  async request(shell) {
    const respPath = shell.cwAddress.path.slice(0, -1).concat('response')
    const value = await asyncPort(shell)(shell.message.payload.arg)
    shell.push({ extId: shell.cwAddress.extId, path: respPath }, { value })
  },
  response() {},
})

export const invoke = <Arg, Val, A extends AsyncFn<Arg, Val>>(
  shell: PortShell<any>,
  rrGates: AsyncShellGatesTopo<Arg, Val, A>
): A =>
  ((arg: Arg) =>
    new Promise((resolve, _reject) => {
      const reqMsg = rrGates.request({ payload: { arg } })
      const unsub = shell.listen(({ message: respMsg }) => {
        if (respMsg.parentMsgId !== reqMsg.id) {
          return
        }
        console.log(`resolve`, respMsg.payload.value)
        resolve(respMsg.payload.value)
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
