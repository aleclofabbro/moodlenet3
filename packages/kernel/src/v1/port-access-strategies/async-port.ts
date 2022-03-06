import { GatesTopology, Port, PortShell, ShellGatesTopology } from '..'

type AsyncFn<Arg, Val> = (arg: Arg) => Promise<Val>

export type AsyncPortTopo<A extends AsyncFn<any, any>> = {
  request: Port<{ arg: A extends AsyncFn<infer Arg, any> ? Arg : never }>
  response: Port<{ value: A extends AsyncFn<any, infer Val> ? Val : never }>
}
export type AsyncGatesTopo<A extends AsyncFn<any, any>> = GatesTopology<
  AsyncPortTopo<A>
>
export type AsyncShellGatesTopo<A extends AsyncFn<any, any>> =
  ShellGatesTopology<AsyncGatesTopo<A>>

export const isAsyncShellGatesTopo = (
  _: any
): _ is AsyncShellGatesTopo<AsyncFn<any, any>> =>
  !!_ && 'request' in _ && 'response' in _ //TODO: so trivial ^^'

export type AsyncPort<A extends AsyncFn<any, any>> = (
  shell: PortShell<{ arg: A extends AsyncFn<infer Arg, any> ? Arg : never }>
) => A
export const asyncPort = <A extends AsyncFn<any, any>>(
  asyncPort: AsyncPort<A>
): AsyncPortTopo<A> => ({
  async request(shell) {
    const respPath = shell.cwAddress.path.slice(0, -1).concat('response')
    const value = await asyncPort(shell)(shell.message.payload.arg)
    shell.push({ extId: shell.cwAddress.extId, path: respPath }, { value })
  },
  response() {},
})

export const invoke = <A extends AsyncFn<any, any>>(
  shell: PortShell<any>,
  rrGates: AsyncShellGatesTopo<A>
): A =>
  ((arg: any) =>
    new Promise((resolve, _reject) => {
      const reqMsg = rrGates.request({ payload: { arg } })
      const unsub = shell.listen(({ message: respMsg }) => {
        if (respMsg.parentMsgId !== reqMsg.id) {
          return
        }
        console.log(`resolve`, respMsg.payload.val)
        resolve(respMsg.payload.value)
        unsub()
      })
    })) as any as A

// type Wrapper<AFN extends AsyncFunction> = (x: string) => AFN
// type Unwrapped<P extends Wrapper<AsyncFunction>> = P extends Wrapper<infer AFN>
//   ? AFN
//   : never
// declare const x: Unwrapped<(c: string) => <T>(d: T) => Promise<[T, string]>>

// ;async () => {
//   const y = await x({ a: 1 })
// }
