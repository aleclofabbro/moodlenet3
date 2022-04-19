import { filter, from, isObservable, map, materialize, mergeMap, Observable, of, TeardownLogic, throwError } from 'rxjs'
import { isPromise } from 'util/types'
import type { ExtDef, ExtId, ExtTopo, Pointer, Port, Shell, TypeofPath } from '../../types'
import { matchMessage } from '../message'
import { joinPointer, splitPointer } from '../pointer'
import {
  ItemData,
  ProvidedValOf,
  SubcriptionPaths,
  SubcriptionReq,
  SubReqData,
  SubTopo,
  UnsubData,
  ValObsOf,
  ValObsProviderOf,
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

export function pub<Def extends ExtDef>(shell: Pick<Shell<Def>, 'emit' | 'msg$'>) {
  return <Path extends SubcriptionPaths<Def>>(pointer: Pointer<Def, Path>) =>
    (valObsProvider: ValObsProviderOf<TypeofPath<ExtTopo<Def>, Path>>) => {
      const SUBSCRIPTIONS: { [k in string]: TeardownLogic | undefined } = {}
      const subP = sub_pointers<Def, Path>(pointer)

      const unsubSubscription = shell.msg$
        .pipe(
          filter(mUnsubMsg => matchMessage<Def>()(mUnsubMsg, subP.unsubPointer as any)),
          map(msg => (msg.data as UnsubData).id),
        )
        .subscribe(teardownAndDelSUB)

      const subSubscription = shell.msg$
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
            return valObs$
          }),
          materialize(),
        )
        .subscribe(pubNotifItem => {
          const itemSpl = splitPointer(subP.itemPointer)
          shell.emit(itemSpl.path as never)({ item: pubNotifItem })
        })

      return async () => {
        // brutally kills pending subscriptions ..
        Object.keys(SUBSCRIPTIONS).forEach(teardownAndDelSUB)
        unsubSubscription.unsubscribe()
        subSubscription.unsubscribe()
      }
      function teardownAndDelSUB(id: string) {
        const teardown = SUBSCRIPTIONS[id]
        delete SUBSCRIPTIONS[id]
        'function' === typeof teardown ? teardown() : teardown?.unsubscribe()
      }
    }
}

export function pubAll<Def extends ExtDef>(
  extId: ExtId<Def>,
  shell: Pick<Shell<Def>, 'emit' | 'msg$'>,
  handles: {
    [Path in SubcriptionPaths<Def>]: ValObsProviderOf<TypeofPath<ExtTopo<Def>, Path>>
  },
) {
  const unsubs = Object.entries(handles).map(([path, valObsProvider]) => {
    const pointer = joinPointer(extId, path)
    return pub(shell)(pointer as never)(valObsProvider as never)
  })
  return () => Promise.all(unsubs.map(unsub => unsub()))
}

export function sub<Def extends ExtDef>(shell: Pick<Shell, 'send' | 'msg$' | 'push'>) {
  return <Path extends SubcriptionPaths<Def>>(pointer: Pointer<Def, Path>) =>
    (req: SubcriptionReq<Def, Path>) =>
      new Observable(subscriber => {
        const subP = sub_pointers<Def, Path>(pointer)
        const reqSplitP = splitPointer(subP.subPointer)
        const reqMsg = shell.send<Def>(reqSplitP.extId)(reqSplitP.path as never)(req)
        const sub = shell.msg$
          .pipe(
            filter(msg => msg.parentMsgId === reqMsg.id && matchMessage<Def>()(msg, subP.itemPointer as any)),
            mergeMap(msg => {
              const notif = (msg.data as ItemData<any>).item
              return typeof notif.kind !== 'string'
                ? throwError(() => new TypeError('Invalid notification, missing "kind"'))
                : notif.kind === 'E'
                ? throwError(() => new Error(notif.error))
                : notif.kind === 'N'
                ? [{ msg, item: notif.value }]
                : []
            }),
          )
          .subscribe(subscriber)
        sub.add(() => {
          const unsubSplitP = splitPointer(subP.unsubPointer)
          shell.send<Def>(unsubSplitP.extId)(unsubSplitP.path as never)(void 0)
        })
        return sub
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
pub<D>(shell)('xxxx@1.4.3::a')(_ => {
  const o = sub<D>(shell)('xxxx@1.4.3::a')(1).pipe(map(_ => _.item))

  return [o, () => {}]
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
  's/v/a': _a => sub<D>(shell)('xxxx@1.4.3::s/v/a')(2).pipe(map(_ => _.item)),
  'a': _a => sub<D>(shell)('xxxx@1.4.3::a')(1).pipe(map(_ => _.item)),
  'b': _a => sub<D>(shell)('xxxx@1.4.3::a')(1).pipe(map(_ => _.item)),
})
// const j: ExtsubTopoPaths<D> = 'a'
// listen.port<D>(s)('xxxx@1.4.3::s.v.l', ({ message: { payload } }) => {})
// listen.ext<D>(s, 'xxxx@1.4.3')('s.g', ({ message: { payload } }) => {})
