import { DepGraph } from 'dependency-graph'
import { interval, map, mergeMap, of, share, Subject, take, tap } from 'rxjs'
import { depGraphAddNodes } from './dep-graph'
import { manageIn } from './k/manageIn'
import { joinPointer, splitExtId } from './k/pointer'
import { pubAll } from './k/sub'
import { createLocalDeploymentRegistry } from './registry'
import type {
  DepGraphData,
  ExposedPointerMap,
  ExposePointers,
  Ext,
  ExtDef,
  ExtDeployable,
  ExtDeployment,
  ExtId,
  ExtName,
  ExtPkg,
  KernelExt,
  Message,
  MWFn,
  PkgInfo,
  PushMessage,
  PushOptions,
  RawExtEnv,
} from './types'

export type CreateCfg = { global_env: Record<ExtName, RawExtEnv> }

export const kernelPkgInfo: PkgInfo = { name: '@moodlenet/kernel', version: '0.1.10' }
export const kernelExtId: ExtId<KernelExt> = 'kernel.core@0.1.10'

// type Env = {
// }
// function getEnv(rawExtEnv: RawExtEnv): Env {
//   return rawExtEnv as any //implement checks
// }

export const create = ({ global_env }: CreateCfg) => {
  const EXPOSED_POINTERS_REG: Record<ExtName, ExposedPointerMap> = {}
  // const _env = getEnv(global_env['kernel.core'])

  const deplReg = createLocalDeploymentRegistry()
  const depGraph = new DepGraph<DepGraphData>()
  const $MAIN_MSGS$ = new Subject<Message>()
  const pipedMessages$ = $MAIN_MSGS$.pipe(
    mergeMap(msg => {
      const orderDepl = depOrderDeployments()
      // console.log({ orderDepl: orderDepl.map(_ => _.ext.id), msg })
      return orderDepl
        .map(({ mw }) => mw)
        .filter((mw): mw is MWFn => !!mw)
        .reduce(($, mwFn) => $.pipe(mergeMap(mwFn)), of(msg))
    }),
    tap(msg => setImmediate(() => console.log('*******msg', msg))),
    share(),
  )

  const kernelExt: Ext<KernelExt> = {
    id: kernelExtId,
    displayName: 'K',
    description: 'K',
    requires: [],
    start: shell => {
      // /* const x =  */ push('out')('kernel.core@0.1.10')('ext/deployment/starting')(1)
      // emit('ext/deployment/stopping')({ reason: 'DISABLING_REQUIRED_EXTENSION' })
      manageIn(shell)('kernel.core@0.1.10::ext/deployment/stopping', stopMsg => {
        // const { bound, data, id, parentMsgId, pointer, source } = stopMsg
        stopMsg.data.reason === 'DISABLING_REQUIRED_EXTENSION'
        console.log('OH MY deployment/stopping', stopMsg.id)
      })
      manageIn(shell)('kernel.core@0.1.10::ext/deployment/starting', startMsg => {
        startMsg.data
        startMsg.pointer === 'kernel.core@0.1.10::ext/deployment/starting'
        console.log('OH MY deployment/starting', startMsg.id)
      })
      manageIn(shell)('kernel.core@0.1.10::ext/deployment/ready', readyMsg => {
        console.log('OH xx MY deployment/ready', readyMsg.id)
      })
      shell.expose({
        'testSub/sub': { validate: () => ({ valid: false, msg: 'no good' }) },
      })
      pubAll<KernelExt>('kernel.core@0.1.10', shell, {
        testSub(_) {
          // console.log({ '**********': _ })
          return interval(500).pipe(
            take(10),
            map(n => /* 
              n === 6
                ? (() => {
                    throw new Error('axx')
                  })()
                : */ ({ a: `${_.req.XX}\n\n(${n})` })),
          )
        },
      })
      setTimeout(() => shell.send<KernelExt>('kernel.core@0.1.10')('ext/deployment/ready')(2), 1000)

      return {
        mw: msg => of(msg) /* .pipe(
            tap(msg => console.log(`got msg: ${msg.pointer}#${msg.id}`)),
            delay(1000),
            tap(msg => console.log(`delayed output of msg: ${msg.pointer}#${msg.id}`)),
          )  */,
      }
    },
  }
  depGraphAddNodes(depGraph, [kernelExt])
  const startKResult = startExtension({ ext: kernelExt, pkgInfo: kernelPkgInfo })
  if (!startKResult.done) {
    throw new Error(
      `Couldn't start ${kernelExt.id} : currDeployment: ${JSON.stringify(startKResult.currDeployment, null, 4)}`,
    )
  }

  // const mainObserver: Observer<Message> = {
  //   next: msg => depOrderDeployments().forEach(deployment => deployment.$msg$.next(msg)),
  //   complete() {},
  //   error() {},
  // }

  return {
    // mainObserver,
    stopExtension,
    startExtension,
    depOrderDeployments,
    extEnv,
    global_env,
    deplReg,
    depGraph,
    $MAIN_MSGS$,
    pipedMessages$,
    startKResult,
  }

  function extEnv(extId: ExtId) {
    //FIXME: should check version compat ?
    const { extName /* , version  */ } = splitExtId(extId)
    console.log('extEnv', extId, extName, global_env, global_env[extName])
    return global_env[extName]
  }

  function stopExtension<Def extends ExtDef = ExtDef>(extId: ExtId<Def>) {
    const stopRes = deplReg.stop(extId)
    if (!stopRes.done) {
      return stopRes
    }
    stopRes.deployment.tearDown.unsubscribe()
    return stopRes.deployment
  }
  function startExtension<Def extends ExtDef = ExtDef>(extPkg: ExtPkg<Def>) {
    const extId = extPkg.ext.id
    const { extName /* , version */ } = splitExtId(extId)
    const env = extEnv(extId)
    const $msg$ = new Subject<Message>()
    const tearDown = pipedMessages$.subscribe($msg$)
    const push: PushMessage<Def> = bound => destExtId => path => (data, _opts) => {
      // console.log('PUSH', { bound, destExtId, path, data, _opts })
      const opts: PushOptions = {
        parent: null,
        primary: false,
        sub: false,
        ..._opts,
      }
      const pointer = joinPointer(destExtId, path)
      const deployment = deplReg.assert(destExtId)
      if (opts.primary) {
        const { extName: pushToExtName } = splitExtId(destExtId)
        const expPnt = EXPOSED_POINTERS_REG[pushToExtName]?.[path]
        if (!expPnt) {
          throw new Error(`pointer ${pointer} is not exposed to primaries`)
        }
        const { valid, msg = '- no details -' } = expPnt.validate(data)
        if (!valid) {
          throw new Error(`data validation didn't pass for ${pointer} : ${msg}`)
        }
      }

      const parentMsgId = opts.parent?.id
      // type DestDef = typeof destExtId extends ExtId<infer Def> ? Def : never
      assertMeIsActive()
      const msg: Message /* <typeof bound, Def, DestDef, typeof path>  */ = {
        id: newMsgId(),
        source: extId,
        bound,
        pointer,
        data: data as any,
        parentMsgId,
        sub: opts.sub,
        // managedBy: null,
        activeDest: deployment.ext.id,
      }

      setTimeout(() => $MAIN_MSGS$.next(msg), 10)
      return msg as any
    }

    const expose: ExposePointers<Def> = expPnt => {
      EXPOSED_POINTERS_REG[extName] = expPnt
    }

    const { mw } =
      extPkg.ext.start({
        pkgInfo: extPkg.pkgInfo,
        extId,
        env,
        msg$: $msg$.asObservable(),
        // removing "as any" generates  "Error: Debug Failure. No error for last overload signature" ->https://github.com/microsoft/TypeScript/issues/33133  ... related:https://github.com/microsoft/TypeScript/issues/37974
        emit: path => (data, opts) => (push as any)('out')(extId)(path)(data, opts),
        send: extId => path => (data, opts) => (push as any)('in')(extId)(path)(data, opts),
        push,
        tearDown,
        expose,
        isExtAvailable: deplReg.isReady,
      }) ?? {}

    const deployable: ExtDeployable<Def> = {
      ...extPkg,
      $msg$,
      mw,
      tearDown,
    }

    return deplReg.start(deployable)

    function assertMeIsActive() {
      deplReg.assert(extId)
    }
  }

  function depOrderDeployments() {
    return depGraph
      .overallOrder()
      .reverse()
      .map(pushToExtName => {
        const deployment = deplReg.get(`${pushToExtName}@*`)
        if (!deployment) {
          //TODO: WARN? THROW? IGNORE?
          return
        }
        return deployment
      })
      .filter((_): _ is ExtDeployment => !!_)
  }
}

function newMsgId() {
  return Math.random().toString(36).substring(2)
}
