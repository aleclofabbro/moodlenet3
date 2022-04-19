import { dematerialize, filter, from, isObservable, map, materialize, of, Subscription, take } from 'rxjs'
import { isPromise } from 'util/types'
import type { ExtDef, ExtId, ExtTopo, Pointer, Port, Shell, TypeofPath } from '../../types'
import { matchMessage } from '../message'
import { joinPointer, splitPointer } from '../pointer'
import {
  ItemData,
  SubcriptionPaths,
  SubcriptionReq,
  SubcriptionTopo,
  SubReqData,
  UnsubData,
  ValObsOf,
  ValObsProviderOf,
} from './types'
export * from './types'

export function pub<Def extends ExtDef>(shell: Pick<Shell<Def>, 'emit' | 'msg$'>) {
  return <Path extends SubcriptionPaths<Def>>(pointer: Pointer<Def, Path>) =>
    (valObsProvider: ValObsProviderOf<TypeofPath<ExtTopo<Def>, Path>>) => {
      const subP = sub_pointers<Def, Path>(pointer)

      const subReqSubscription = shell.msg$
        .pipe(filter(msg => matchMessage<Def>()(msg, subP.sub as any)))
        .subscribe(subReqMsg => {
          const providedValOf = valObsProvider({
            req: (subReqMsg.data as SubReqData<any>).req,
            msg: subReqMsg,
          })

          const [valObs$_or_valPromise_orVal, tearDownLogic] = Array.isArray(providedValOf)
            ? providedValOf
            : [providedValOf]

          const valObs$ =
            isPromise(valObs$_or_valPromise_orVal) || isObservable(valObs$_or_valPromise_orVal)
              ? valObs$_or_valPromise_orVal
              : of(valObs$_or_valPromise_orVal)

          const mainSubscription = new Subscription()

          const itemSpl = splitPointer(subP.item)
          const emitValMsgSubscription = from(valObs$)
            .pipe(materialize())
            .subscribe(pubNotifItem => shell.emit(itemSpl.path as never)({ item: pubNotifItem }))

          const unsubMsgSubscription = shell.msg$
            .pipe(
              filter(mUnsubMsg => matchMessage<Def>()(mUnsubMsg, subP.unsubOut as any)),
              map(msg => (msg.data as UnsubData).id),
              filter(id => id === subReqMsg.id),
              take(1),
            )
            .subscribe(() => mainSubscription.unsubscribe())

          mainSubscription.add(tearDownLogic)
          mainSubscription.add(emitValMsgSubscription)
          mainSubscription.add(unsubMsgSubscription)
        })

      return subReqSubscription
    }
}

export function pubAll<Def extends ExtDef>(
  extId: ExtId<Def>,
  shell: Pick<Shell<Def>, 'emit' | 'msg$'>,
  handles: {
    [Path in SubcriptionPaths<Def>]: ValObsProviderOf<TypeofPath<ExtTopo<Def>, Path>>
  },
) {
  const unsubAll = new Subscription()
  return [
    unsubAll,
    Object.entries(handles).reduce(
      (__, [path, port]) => {
        const fullPath = joinPointer(extId, path)
        const subscription = pub(shell)(fullPath as never)(port as never)
        unsubAll.add(subscription)
        return {
          ...__,
          [fullPath]: subscription,
        }
      },
      {} as {
        [Path in SubcriptionPaths<Def>]: Subscription
      },
    ),
  ] as const
}

export function sub<Def extends ExtDef>(shell: Pick<Shell, 'send' | 'msg$'>) {
  return <Path extends SubcriptionPaths<Def>>(pointer: Pointer<Def, Path>) =>
    (req: SubcriptionReq<Def, Path>): ValObsOf<TypeofPath<ExtTopo<Def>, Path>> => {
      const subP = sub_pointers<Def, Path>(pointer)
      const reqSplitP = splitPointer(subP.sub)
      const reqMsg = shell.send<Def>(reqSplitP.extId)(reqSplitP.path as never)(req)
      const subObs = shell.msg$.pipe(
        filter(msg => msg.parentMsgId === reqMsg.id && matchMessage<Def>()(msg, subP.item as any)),
        map(msg => (msg.data as ItemData<any>).item),
        dematerialize(),
      )
      return subObs as any
    }
}

function sub_pointers<Def extends ExtDef, Path extends SubcriptionPaths<Def>>(pointer: Pointer<Def, Path>) {
  return {
    sub: `${pointer}/sub` as `${Pointer<Def, Path>}/sub`,
    item: `${pointer}/item` as `${Pointer<Def, Path>}/item`,
    unsub: `${pointer}/unsub` as `${Pointer<Def, Path>}/unsub`,
    unsubOut: `${pointer}/unsubOut` as `${Pointer<Def, Path>}/unsubOut`,
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
    a: SubcriptionTopo<1 | 3, 5 | 7>
    s: {
      g: Port<'in', 11>
      v: {
        l: Port<'out', string>
        a: SubcriptionTopo<2 | 4, 6 | 8>
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
pub<D>(shell)('xxxx@1.4.3::s/v/a')(_ => {
  const o = sub<D>(shell)('xxxx@1.4.3::s/v/a')(2)

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
  's/v/a': _a => [sub<D>(shell)('xxxx@1.4.3::s/v/a')(2)],
  'a': _a => [sub<D>(shell)('xxxx@1.4.3::a')(1)],
})
// const j: ExtsubTopoPaths<D> = 'a'
// listen.port<D>(s)('xxxx@1.4.3::s.v.l', ({ message: { payload } }) => {})
// listen.ext<D>(s, 'xxxx@1.4.3')('s.g', ({ message: { payload } }) => {})
