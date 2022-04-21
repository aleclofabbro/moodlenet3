import {
  filter,
  firstValueFrom,
  from,
  isObservable,
  map,
  materialize,
  merge,
  mergeMap,
  Observable,
  of,
  Subject,
  TeardownLogic,
  throwError,
} from 'rxjs'
import { isPromise } from 'util/types'
import type { ExtDef, ExtId, ExtTopo, Message, Pointer, Port, Shell, TypeofPath } from '../../types'
import { matchMessage } from '../message'
import { joinPointer, splitPointer } from '../pointer'
import {
  ItemData,
  ProvidedValOf,
  SubcriptionPaths,
  SubcriptionReq,
  SubReqData,
  SubTopo,
  ValObsOf,
  ValObsProviderOf,
  ValOf,
  ValPromiseOf,
} from './types'
export * from './types'

function providedValToObsAndTeardown(providedValOf: ProvidedValOf<SubTopo<any, any>>) {
  const [valObs$_or_valPromise_orVal, tearDownLogic] = Array.isArray(providedValOf) ? providedValOf : [providedValOf]

  const valObs$ =
    isPromise(valObs$_or_valPromise_orVal) || isObservable(valObs$_or_valPromise_orVal)
      ? from(valObs$_or_valPromise_orVal)
      : of(valObs$_or_valPromise_orVal)

  return [valObs$, tearDownLogic] as const
}

export function mapItemVal<T extends { val: any }>() {
  return map<T, T['val']>(_ => _.val)
}

export function pub<Def extends ExtDef>(shell: Pick<Shell<Def>, 'emit' | 'msg$'>) {
  return <Path extends SubcriptionPaths<Def>>(pointer: Pointer<Def, Path>) =>
    (valObsProvider: ValObsProviderOf<TypeofPath<ExtTopo<Def>, Path>>) =>
      new Observable(subscriber => {
        const SUBSCRIPTIONS: { [k in string]: TeardownLogic | undefined } = {}
        const $KILL_SUBSCRIPTIONS$ = new Subject<Message>()
        const subP = sub_pointers<Def, Path>(pointer)
        subscriber.add(
          shell.msg$
            .pipe(
              filter(mUnsubMsg => matchMessage<Def>()(mUnsubMsg, subP.unsubPointer as any)),
              map(msg => msg.parentMsgId),
              filter((id): id is string => !!id),
            )
            .subscribe(teardownAndDelSUB),
        )
        subscriber.add(
          shell.msg$
            .pipe(
              filter(msg => matchMessage<Def>()(msg, subP.subPointer as any)),
              mergeMap(subReqMsg => {
                const [valObs$, tearDownLogic] = providedValToObsAndTeardown(
                  valObsProvider({
                    req: (subReqMsg.data as SubReqData<any>).req,
                    msg: subReqMsg,
                  }),
                )
                SUBSCRIPTIONS[subReqMsg.id] = tearDownLogic
                return merge($KILL_SUBSCRIPTIONS$, valObs$)
              }),
              materialize(),
            )
            .subscribe(pubNotifItem => {
              const itemSpl = splitPointer(subP.itemPointer)
              shell.emit(itemSpl.path as never)({ item: pubNotifItem })
            }),
        )
        subscriber.add(() => {
          $KILL_SUBSCRIPTIONS$.error(`${pointer} publisher ended`)
          // brutally kills pending subscriptions when unsubscribing..
          // TODO: define and implement policies, gentle unsubs ..
          Object.keys(SUBSCRIPTIONS).forEach(teardownAndDelSUB)
        })

        function teardownAndDelSUB(id: string) {
          const teardown = SUBSCRIPTIONS[id]
          delete SUBSCRIPTIONS[id]
          'function' === typeof teardown ? teardown() : teardown?.unsubscribe()
        }
      })
}

export function pubAll<Def extends ExtDef>(
  extId: ExtId<Def>,
  shell: Pick<Shell<Def>, 'emit' | 'msg$'>,
  handles: {
    [Path in SubcriptionPaths<Def>]: ValObsProviderOf<TypeofPath<ExtTopo<Def>, Path>>
  },
) {
  const allPubOb$ = Object.entries(handles).map(([path, valObsProvider]) => {
    const pointer = joinPointer(extId, path)
    return pub(shell)(pointer as never)(valObsProvider as never)
  })
  return merge(...allPubOb$)
}

export function subP<Def extends ExtDef>(shell: Pick<Shell, 'send' | 'msg$' | 'push'>) {
  return <Path extends SubcriptionPaths<Def>>(pointer: Pointer<Def, Path>) =>
    (req: SubcriptionReq<Def, Path>) => {
      const itemData = firstValueFrom(sub<Def>(shell)<Path>(pointer)(req))
      return itemData as ValPromiseOf<TypeofPath<ExtTopo<Def>, Path>>
    }
}

export function subPVal<Def extends ExtDef>(shell: Pick<Shell, 'send' | 'msg$' | 'push'>) {
  return <Path extends SubcriptionPaths<Def>>(pointer: Pointer<Def, Path>) =>
    async (req: SubcriptionReq<Def, Path>) => {
      const itemData = await subP<Def>(shell)<Path>(pointer)(req)
      return itemData.val as ValOf<TypeofPath<ExtTopo<Def>, Path>>
    }
}

export function sub<Def extends ExtDef>(shell: Pick<Shell, 'send' | 'msg$' | 'push'>) {
  return <Path extends SubcriptionPaths<Def>>(pointer: Pointer<Def, Path>) =>
    (req: SubcriptionReq<Def, Path>) =>
      new Observable(subscriber => {
        const subP = sub_pointers<Def, Path>(pointer)
        const reqSplitP = splitPointer(subP.subPointer)
        const reqMsg = shell.send<Def>(reqSplitP.extId)(reqSplitP.path as never)(req)
        const subscriberSub = shell.msg$
          .pipe(
            filter(msg => msg.parentMsgId === reqMsg.id && matchMessage<Def>()(msg, subP.itemPointer as any)),
            mergeMap(msg => {
              const notif = (msg.data as ItemData<any>).item
              return typeof notif.kind !== 'string'
                ? throwError(() => new TypeError('Invalid notification, missing "kind"'))
                : notif.kind === 'E'
                ? throwError(() => new Error(notif.error))
                : notif.kind === 'N'
                ? [{ msg, val: notif.value }] /*/ TODO: this duplicates value (in msg.data.value) */
                : []
            }),
          )
          .subscribe(subscriber)
        return () => {
          const unsubSplitP = splitPointer(subP.unsubPointer)
          shell.send<Def>(unsubSplitP.extId)(unsubSplitP.path as never)(void 0)
          subscriberSub.unsubscribe()
        }
      }) as ValObsOf<TypeofPath<ExtTopo<Def>, Path>>
}

function sub_pointers<Def extends ExtDef, Path extends SubcriptionPaths<Def>>(pointer: Pointer<Def, Path>) {
  return {
    subPointer: `${pointer}/sub` as `${Pointer<Def, Path>}/sub`,
    itemPointer: `${pointer}/item` as `${Pointer<Def, Path>}/item`,
    unsubPointer: `${pointer}/unsub` as `${Pointer<Def, Path>}/unsub`,
    // unsubOut: `${pointer}/unsubOut` as `${Pointer<Def, Path>}/unsubOut`,
  }
}

/*
 *
 *
 *
 */

type D = ExtDef<
  'xxxx',
  '1.4.3',
  {
    d: Port<'in', string>
    b: SubTopo<1 | 3, 5 | 7>
    a: SubTopo<1 | 3, 5 | 7>
    s: {
      g: Port<'in', 11>
      v: {
        l: Port<'out', string>
        a: SubTopo<2 | 4, 6 | 8>
      }
      // a: FunTopo<C>
    }
  }
>
declare const shell: Shell<D>

const g = sub<D>(shell)('xxxx@1.4.3::s/v/a')(4).subscribe(_ => {})
const h = sub<D>(shell)('xxxx@1.4.3::a')(3).subscribe(_ => {})

// sub<D>(shell)('xxxx@1.4.3::alpha/beta/gamma')(4).subscribe(_ => {})
// sub<D>(shell)('xxxx@1.4.3::/alpha/beta/gamma')(4).subscribe(_ => {})
// sub<D>(shell)('xxxx@1.4.3:/alpha/beta/gamma')(4).subscribe(_ => {})
// sub<D>(shell)('xxxx@1.4.3/alpha/beta/gamma')(4).subscribe(_ => {})
// sub<D>(shell)('/xxxx@1.4.3/alpha/beta/gamma')(4).subscribe(_ => {})
// sub<D>(shell)('/xxxx/1.4.3/alpha/beta/gamma')(4).subscribe(_ => {})

g
h
pub<D>(shell)('xxxx@1.4.3::a')(async _ => {
  const o = await subPVal<D>(shell)('xxxx@1.4.3::a')(1)

  return o //[o, () => {}]
  /* 
  return [firstValueFrom(o), () => {}]
  return 8
  return o
  return [o]
  return lastValueFrom( o)
  return [6,8]
  return [Promise.resolve(8)]
 */
})
pubAll<D>('xxxx@1.4.3', shell, {
  's/v/a': _a => sub<D>(shell)('xxxx@1.4.3::s/v/a')(2).pipe(mapItemVal()),
  'a': _a => sub<D>(shell)('xxxx@1.4.3::a')(1).pipe(mapItemVal()),
  'b': _a => sub<D>(shell)('xxxx@1.4.3::a')(1).pipe(mapItemVal()),
})
// const j: ExtsubTopoPaths<D> = 'a'
// listen.port<D>(s)('xxxx@1.4.3::s.v.l', ({ message: { payload } }) => {})
// listen.ext<D>(s, 'xxxx@1.4.3')('s.g', ({ message: { payload } }) => {})
