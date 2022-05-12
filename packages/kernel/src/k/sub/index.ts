import {
  EMPTY,
  filter,
  from,
  map,
  materialize,
  merge,
  mergeMap,
  Observable,
  Subject,
  Subscription,
  takeUntil,
  takeWhile,
  tap,
  throwError
} from 'rxjs'
import type { DataMessage, ExtDef, ExtId, ExtTopo, Pointer, Port, PushOptions, Shell, TopoPaths, TypeofPath } from '../../types'
import { manageMsg, matchMessage } from '../message'
import { isBWCSemanticallySamePointers, joinPointer, splitPointer } from '../pointer'
import { ItemData, SubcriptionPaths, SubObsProviderDef, SubObsProviderDefOfTopo, SubTopo, ValObsTopoProviderOf } from './types'
export * from './types'

// function providedValToObsAndTeardown(providedValOf: ProvidedValOf<SubTopo<any>>) {
//   const [valObs$_or_valPromise_orVal, tearDownLogic] = Array.isArray(providedValOf) ? providedValOf : [providedValOf]

//   const valObs$ =
//     isPromise(valObs$_or_valPromise_orVal) || isObservable(valObs$_or_valPromise_orVal)
//       ? from(valObs$_or_valPromise_orVal)
//       : of(valObs$_or_valPromise_orVal)

//   return [valObs$, tearDownLogic] as const
// }

const PUB_SYM = Symbol()
export function pub<Def extends ExtDef>(shell: Pick<Shell<Def>, 'emit' | 'msg$' | 'extId'>) {
  return <Path extends SubcriptionPaths<Def>>(pointer: Pointer<Def, Path>) =>
    (valObsProvider: ValObsTopoProviderOf<TypeofPath<ExtTopo<Def>, Path>>) => /* new Observable(subscriber =>  */ {
      const mainSub = new Subscription(killAllAndDelSUB)

      const SUBSCRIPTIONS: { [k in string]: () => void /* TeardownLogic | undefined  */ } = {}
      const $ALL_SUBSCRIPTIONS_KILLER$ = new Subject<never>()
      const subP = sub_pointers<Def, Path>(pointer)
      const unsubsSub = shell.msg$
        .pipe(
          filter(mUnsubMsg => matchMessage<Def>()(mUnsubMsg, subP.unsubPointer as any)),
          map(msg => msg.parentMsgId),
          filter((id): id is string => !!id),
        )
        .subscribe(teardownAndDelSUB)
      const manageMsgsSub = shell.msg$
        .pipe(
          // tap(console.log),
          filter(msg => matchMessage<Def>()(msg, subP.subPointer as any)),
          mergeMap(subReqMsg => {
            manageMsg(subReqMsg, shell.extId)
            try {
              const valObs$ = from(valObsProvider(mainSub, subReqMsg)(...subReqMsg.data.req))
              if (!subReqMsg.sub) {
                return EMPTY
              }
              const $UNSUB_THIS$ = new Subject()
              SUBSCRIPTIONS[subReqMsg.id] = () => {
                $UNSUB_THIS$.next(0)
                $UNSUB_THIS$.complete()
              }
              return merge(
                $ALL_SUBSCRIPTIONS_KILLER$,
                valObs$.pipe(
                  takeUntil($UNSUB_THIS$),
                  materialize(),
                  tap(notif => ((notif as any)[PUB_SYM] = subReqMsg)),
                ),
              )
            } catch (err: any) {
              return throwError(() => err).pipe(
                materialize(),
                tap(notif => ((notif as any)[PUB_SYM] = subReqMsg)),
              )
            }
          }),
        )
        .subscribe(pubNotifItem => {
          const parentMsg: DataMessage<any> = (pubNotifItem as any)[PUB_SYM]
          const itemSpl = splitPointer(subP.itemPointer)
          shell.emit(itemSpl.path as never)({ item: pubNotifItem }, { parent: parentMsg })
        })

      manageMsgsSub.add(mainSub)
      mainSub.add(manageMsgsSub)
      mainSub.add(unsubsSub)

      return mainSub

      function killAllAndDelSUB() {
        $ALL_SUBSCRIPTIONS_KILLER$.error(`${pointer} publisher ended`)
        // brutally kills pending subscriptions when unsubscribing..
        // TODO: define and implement policies, gentle unsubs ..
        Object.keys(SUBSCRIPTIONS).forEach(teardownAndDelSUB)
      }

      function teardownAndDelSUB(id: string) {
        const teardown = SUBSCRIPTIONS[id]
        // console.log({ teardownAndDelSUB: id, teardown, SUBSCRIPTIONS })
        delete SUBSCRIPTIONS[id]
        teardown?.()
      }
    } /* ) */
}

export function pubAll<Def extends ExtDef>(
  extId: ExtId<Def>,
  shell: Pick<Shell<Def>, 'emit' | 'msg$' | 'extId'>,
  handles: {
    [Path in SubcriptionPaths<Def>]: ValObsTopoProviderOf<TypeofPath<ExtTopo<Def>, Path>>
  },
) {
  const allPubSubs = Object.entries(handles).map(([path, valObsProvider]) => {
    const pointer = joinPointer(extId, path)
    return pub(shell)(pointer as never)(valObsProvider as never)
  })
  const globalSub = new Subscription()
  allPubSubs.forEach(sub => globalSub.add(sub))
  return globalSub
}

// export function subP<Def extends ExtDef>(shell: Pick<Shell, 'send' | 'msg$' | 'push'>) {
//   return <Path extends SubcriptionPaths<Def>>(pointer: Pointer<Def, Path>) =>
//     (req: SubcriptionReq<Def, Path>) => {
//       const itemData = firstValueFrom(sub<Def>(shell)<Path>(pointer)(req))
//       return itemData as ValPromiseOf<TypeofPath<ExtTopo<Def>, Path>>
//     }
// }

// export function subPVal<Def extends ExtDef>(shell: Pick<Shell, 'send' | 'msg$' | 'push'>) {
//   return <Path extends SubcriptionPaths<Def>>(pointer: Pointer<Def, Path>) =>
//     async (req: SubcriptionReq<Def, Path>) => {
//       const itemData = await subP<Def>(shell)<Path>(pointer)(req)
//       return itemData.msg.data as ValTypeOf<TypeofPath<ExtTopo<Def>, Path>>
//     }
// }

// export function subDemat<Def extends ExtDef>(shell: Pick<Shell, 'send' | 'msg$' | 'push'>) {
//   return <Path extends SubcriptionPaths<Def>>(pointer: Pointer<Def, Path>) =>
//     (req: SubcriptionReq<Def, Path>, _opts?: Partial<PushOptions>) =>
//       sub<Def>(shell)<Path>(pointer)(req, _opts).pipe(dematMessage())
// }

export function dematMessage<T>() {
  return mergeMap<{ msg: DataMessage<ItemData<T>> }, { msg: DataMessage<T> }[]>(({ msg }) => {
    const notif = msg.data.item
    // console.log({ msg, notif, ________________________: '' })
    return typeof notif.kind !== 'string'
      ? (throwError(() => new TypeError('Invalid notification, missing "kind"')) as unknown as {
          msg: DataMessage<T>
        }[])
      : notif.kind === 'E'
      ? (throwError(() => new Error(notif.error)) as unknown as { msg: DataMessage<T> }[])
      : notif.kind === 'N'
      ? [{ msg: { ...msg, data: notif.value } }]
      : notif.kind === 'C'
      ? []
      : (throwError(
          () =>
            new TypeError(
              `Invalid notification, unknown "kind" ` +
                // @ts-expect-error
                notif.kind,
            ),
        ) as unknown as { msg: DataMessage<T> }[])
  })
}

type SubWrapper = <Params extends ReadonlyArray<unknown>, Ret>(
  f: (...args: Params) => Ret,
  // ) => (...args: Params) => Observable<DataMessage<Ret>>
) => (...args: Params) => Ret

const subWrapper: SubWrapper = _ => _ as any


export function sub<Def extends ExtDef>(shell: Pick<Shell, 'send' | 'msg$' | 'push'>) {
  return <Path extends SubcriptionPaths<Def> >(pointer: Pointer<Def, Path>, _opts?: Partial<PushOptions>) => {
    const SP= ((...args: any) =>
      new Observable(subscriber => {
        const mainSub = new Subscription()
        try {
          const subP = sub_pointers<Def, Path>(pointer)
          const reqSplitP = splitPointer(subP.subPointer)
          const reqMsg = shell.send<Def>(reqSplitP.extId)(reqSplitP.path as never)({ args }, { ..._opts, sub: true })
          const subscriberSub = shell.msg$
            .pipe(
              // tap(____ => console.log({ ____, reqMsg, itemPointer: subP.itemPointer })),
              filter(
                (msg): msg is DataMessage<ItemData<any>> =>
                  msg.parentMsgId === reqMsg.id && isBWCSemanticallySamePointers(subP.itemPointer, msg.pointer),
              ),
              takeWhile(msg => msg.data.item.kind !== 'C', true),
              map(msg => ({ msg })),
            )
            .subscribe(subscriber)
          mainSub.add(subscriberSub)
          return () => {
            const unsubSplitP = splitPointer(subP.unsubPointer)
            shell.send<Def>(unsubSplitP.extId)(unsubSplitP.path as never)(void 0, { parent: reqMsg })
            subscriberSub.unsubscribe() // maybe useless .. but not harmful
          }
        } catch (err) {
          subscriber.error(err)
          return () => mainSub.unsubscribe()
        }
      })) as SubObsProviderDefOfTopo<Def, Path>
      
    return subWrapper(SP )
  }
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
 **********************************************************************************************************
 **********************************************************************************************************
 **********************************************************************************************************
 **********************************************************************************************************
 **********************************************************************************************************
 ****************************  MAKING TESTS DOWN THERE  ***************************************************
 **********************************************************************************************************
 **********************************************************************************************************
 **********************************************************************************************************
 **********************************************************************************************************
 **********************************************************************************************************
 **********************************************************************************************************
 **********************************************************************************************************
 **********************************************************************************************************
 **********************************************************************************************************
 **********************************************************************************************************
 **********************************************************************************************************
 **********************************************************************************************************
 **********************************************************************************************************
 **********************************************************************************************************
 **********************************************************************************************************
 **********************************************************************************************************
 **********************************************************************************************************
 */


 type B = <T>(_: T, s: string) => {tt:T, ss:string}
 type A = <T, A>(_: T, a: A) => { t: T; a: A }
type D = ExtDef<
  'xxxx',
  '1.4.3',
  {
    d: Port<'in', string>
    b: SubTopo<B>
    a: SubTopo<A>
    s: {
      g: Port<'in', 11>
      v: {
        l: Port<'out', string>
        a: SubTopo<(_: 'req s/v/a') => 'res s/v/a'>
      }
      // a: FunTopo<C>
    }
  }
>
declare const shell: Shell<D>
declare const f: SubObsProviderDefOfTopo<D, 'b'>

type _SubcriptionPaths<Def extends ExtDef ,SP extends SubObsProviderDef> = TopoPaths<Def, SubTopo<SP>>  & TopoPaths<Def>
type _SubWrapper<SP extends (...args:any)=>any>= SP extends (...args:infer Args)=>infer Ret ?(...args: Args) => Ret:never


type Wraps<Params extends ReadonlyArray<unknown>, Ret> = (...args: Params) => { value: Ret }

declare function wraps<Params extends ReadonlyArray<unknown>, Ret>(fn:(...args: Params) => Ret): 
  Wraps<Params, Ret>

export function y<Def extends ExtDef>(shell: Pick<Shell, 'send' | 'msg$' | 'push'>):
<Path extends SubcriptionPaths<Def> >(pointer: Pointer<Def, Path>) => 

declare function aFunction<T>(t: T): { a: T }


const c = f(10,'')
;async () => {
  const x = subWrapper(f)
  x(100, '').toExponential()
  x('0', '').toExponential()
  x('0', '').at(1)
  x<number>(100, '').toExponential()
  x<string>(100, '').at(3)
  x<string>('100', '').at(1)
  x<string>('100', '').at()
  x<string>('100').at(1)
  x<string>('100', '').subscribe(_ => _.data.charCodeAt(2))


  type vv = SubcriptionPaths<D>
  
  const cc=y<D, B>()(12,'12')
  const c=y<D, B>('xxxx@1.4.3')('b')(12,'12')
  y<D, B>('xxxx@1.4.3')('b')<number>(100, '')
  y<D, B>('xxxx@1.4.3')('b')<number>(100, '').tt.toExponential()
  y<D, B>('xxxx@1.4.3')('b')<string>(100, '').tt.at(3)
  y<D, B>('xxxx@1.4.3')('b')<string>('100', '').tt.at(1)
  y<D, B>('xxxx@1.4.3')('b')<string>('100', '').tt.at()
  y<D, B>('xxxx@1.4.3')('b')<string>('100').tt.at(1)
  y<D, A>('xxxx@1.4.3')('a')('100', '').subscribe(_ => _.data.charCodeAt(2))

  sub<D>(shell)('xxxx@1.4.3::b')<number>(100,'').toExponential()
  let gg=sub<D>(shell)('xxxx@1.4.3::b')
  sub<D>(shell)('xxxx@1.4.3::b')('100','').at(8)
  sub<D>(shell)('xxxx@1.4.3::b')(100,'').at(4)
  const g = sub<D>(shell)('xxxx@1.4.3::b')
  g(100,'')
  g()
  g.subscribe(_ => {
    const x = _.data
  })
  const h = sub<D>(shell)('xxxx@1.4.3::a')(100, 'req a').subscribe(_ => {
    _.data.a
    _.t
  })
  // const w = subDemat<D>(shell)('xxxx@1.4.3::a')('req a').subscribe(_ => {
  //   _.msg.data
  // })
  // w
  // sub<D>(shell)('xxxx@1.4.3::alpha/beta/gamma')(4).subscribe(_ => {})
  // sub<D>(shell)('xxxx@1.4.3::/alpha/beta/gamma')(4).subscribe(_ => {})
  // sub<D>(shell)('xxxx@1.4.3:/alpha/beta/gamma')(4).subscribe(_ => {})
  // sub<D>(shell)('xxxx@1.4.3/alpha/beta/gamma')(4).subscribe(_ => {})
  // sub<D>(shell)('/xxxx@1.4.3/alpha/beta/gamma')(4).subscribe(_ => {})
  // sub<D>(shell)('/xxxx/1.4.3/alpha/beta/gamma')(4).subscribe(_ => {})

  g
  h

  pub<D>(shell)('xxxx@1.4.3::a')((_msub, __) => (t, a) => {
    const o = sub<D>(shell)('xxxx@1.4.3::a')(t, a)

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
    's/v/a': (_sub, msg) => _a => sub<D>(shell)('xxxx@1.4.3::s/v/a')('req s/v/a'),
    'a': (_sub, msg) => (_a, _t) => {
      return sub<D>(shell)('xxxx@1.4.3::a')(_a, _t)
    },
    'b': (_sub, msg) => _a => sub<D>(shell)('xxxx@1.4.3::b')(_a),
  })
  // // const j: ExtsubTopoPaths<D> = 'a'
  // // listen.port<D>(s)('xxxx@1.4.3::s.v.l', ({ message: { payload } }) => {})
  // // listen.ext<D>(s, 'xxxx@1.4.3')('s.g', ({ message: { payload } }) => {})
}
