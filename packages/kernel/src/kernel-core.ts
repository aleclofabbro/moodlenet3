import { DepGraph } from 'dependency-graph'
import { delay, mergeMap, of, Subject, tap } from 'rxjs'
import { depGraphAddNodes } from './dep-graph'
import { isMessage } from './k/message'
import { joinPointer } from './k/pointer'
import { createLocalDeploymentRegistry } from './registry'
import type {
  DepGraphData,
  Ext,
  ExtDef,
  ExtDeployable,
  ExtDeployment,
  ExtId,
  ExtPkg,
  KernelExt,
  Message,
  MWFn,
  PkgInfo,
  PushMessage,
} from './types'

export const kernelPkgInfo: PkgInfo = { name: '@moodlenet/kernel', version: '0.0.1' }
export const kernelExtId: ExtId<KernelExt> = 'kernel.core@0.0.1'
// export const create = (
//   bareMetal: BareMetalHandle,
//   startExts: ExtPkgInfo[],
// ): [ExtDeployment<KernelExt>, ...ExtDeployment<ExtDef>[]] => {
export const create = () => {
  const cfgPath = process.env.KERNEL_ENV_MOD ?? `${process.cwd()}/kernel-env-mod`
  const global_env: Record<string, any> = require(cfgPath)
  const deplReg = createLocalDeploymentRegistry()
  const depGraph = new DepGraph<DepGraphData>()
  const $MAIN_MSGS$ = new Subject<Message>()
  const pipedMessages$ = $MAIN_MSGS$.pipe(
    mergeMap(msg =>
      depOrderDeployments()
        .map(({ mw }) => mw)
        .filter((mw): mw is MWFn => !!mw)
        .reduce((_, mwFn) => _.pipe(mergeMap(mwFn)), of(msg)),
    ),
  )

  const kernelExt: Ext<KernelExt> = {
    id: kernelExtId,
    displayName: 'K',
    description: 'K',
    requires: [],
    start: ({ /* env,  */ msg$, push, emit }) => {
      /* const x =  */ push('out')('kernel.core@0.0.1')('ext/deployment/starting')(1)
      emit('ext/deployment/stopping')({ reason: 'DISABLING_REQUIRED_EXTENSION' })
      msg$.subscribe(msg => {
        if (isMessage<KernelExt>()(msg, 'kernel.core@0.0.1::ext/deployment/stopping')) {
          // const { bound, data, id, parentMsgId, pointer, source } = msg
          msg.bound
        }
      })
      return {
        mw: msg =>
          of(msg).pipe(
            tap(msg => console.log(`got msg:${msg.id}`)),
            delay(1000),
            tap(msg => console.log(`delayed output of msg:${msg.id}`)),
          ),
      }
    },
  }
  depGraphAddNodes(depGraph, [kernelExt])
  const startKResult = startExtension({ ext: kernelExt, pkgInfo: kernelPkgInfo })
  stopExtension
  if (!startKResult.done) {
    throw new Error(
      `Couldn't start ${kernelExt.id} : currDeployment: ${JSON.stringify(startKResult.currDeployment, null, 4)}`,
    )
  }

  return () => {
    const mainSub = pipedMessages$.subscribe(msg =>
      depOrderDeployments().forEach(deployment => deployment.$msg$.next(msg)),
    )
    return {
      mainSub,
    }
  }
  function extEnv(extId: ExtId) {
    //FIXME: should check version compat
    return global_env[extId]
  }

  function stopExtension<Def extends ExtDef = ExtDef>(extId: ExtId<Def>) {
    const stopRes = deplReg.stop(extId)
    if (!stopRes.done) {
      return stopRes
    }
    stopRes.deployment.$msg$.complete()
    return stopRes.deployment
  }
  function startExtension<Def extends ExtDef = ExtDef>(extPkg: ExtPkg<Def>) {
    const extId = extPkg.ext.id
    const env = extEnv(extId)
    const $msg$ = new Subject<Message>()
    const msg$ = $msg$.asObservable()
    const push: PushMessage<Def> = bound => destExtId => path => data => {
      // type DestDef = typeof destExtId extends ExtId<infer Def> ? Def : never
      assertIsActive()
      const pointer = joinPointer(destExtId, path)
      const msg: Message /* <typeof bound, Def, DestDef, typeof path>  */ = {
        id: newMsgId(),
        source: extId,
        bound,
        pointer,
        data: data as any,
        parentMsgId: null,
      }

      $MAIN_MSGS$.next(msg)
      return msg as any
    }
    const { mw } =
      extPkg.ext.start({
        pkgInfo: extPkg.pkgInfo,
        extId,
        env,
        msg$,
        // removing "as any" generates  https://github.com/microsoft/TypeScript/issues/33133
        emit: path => data => (push as any)('out')(extId)(path)(data),
        send: extId => path => data => (push as any)('in')(extId)(path)(data),
        push,
      }) ?? {}
    const deployable: ExtDeployable<Def> = {
      ...extPkg,
      $msg$,
      mw,
    }

    return deplReg.start(deployable)
    function assertIsActive() {
      const deployment = deplReg.get(extId)
      if (!deployment) {
        throw new Error(`${extId} has no deployment`)
      }
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
