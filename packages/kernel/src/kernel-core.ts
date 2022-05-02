import { DepGraph } from 'dependency-graph'
import { interval, map, mergeMap, of, share, Subject, take, tap } from 'rxjs'
import { depGraphAddNodes } from './dep-graph'
import { matchMessage } from './k/message'
import { isVerBWC, joinPointer, splitExtId, splitPointer } from './k/pointer'
import { pubAll } from './k/sub'
import { createLocalDeployableRegistry } from './registry'
import type {
  DepGraphData,
  DeploymentShell,
  ExposedPointerMap,
  ExposePointers,
  Ext,
  ExtDef,
  ExtDepl,
  ExtId,
  ExtName,
  IMessage,
  KernelExt,
  MessagePush,
  MWFn,
  OnExtDeployable,
  OnExtDeployment,
  PkgInfo,
  PushMessage,
  PushOptions,
  RawExtEnv,
  RegDeployable,
  Shell,
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

  const deplReg = createLocalDeployableRegistry()
  const depGraph = new DepGraph<DepGraphData>()
  const $MAIN_MSGS$ = new Subject<IMessage<any>>()
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
    enable: shell => {
      return {
        mw: msg => of(msg),
        deploy({ expose /* , tearDown  */ }) {
          expose({
            'testSub/sub': { validate: () => ({ valid: true, msg: 'no good' }) },
          })
          pubAll<KernelExt>('kernel.core@0.1.10', shell, {
            testSub(_) {
              return interval(500).pipe(
                take(5),
                map(n => ({ a: `${_.msg.data.req.XX}\n\n(${n})` })),
              )
            },
          })
          return {}
        },
      }
    },
  }
  depGraphAddNodes(depGraph, [kernelExt])
  const KDeployable = enableExtension<KernelExt>({ ext: kernelExt, pkgInfo: kernelPkgInfo })
  const KDeployment = deployExtension({ extId: kernelExtId })

  return {
    deployExtension,
    disableExtension,
    undeployExtension,
    enableExtension,
    depOrderDeployments,
    extEnv,
    global_env,
    deplReg,
    depGraph,
    $MAIN_MSGS$,
    pipedMessages$,
    KDeployable,
    KDeployment,
  }

  function extEnv(extId: ExtId) {
    //FIXME: should check version compat ?
    const { extName /* , version  */ } = splitExtId(extId)
    console.log('extEnv', extId, extName, global_env, global_env[extName])
    return global_env[extName]
  }

  function disableExtension(extName: ExtName) {
    return deplReg.disable(extName)
  }
  function undeployExtension(extName: ExtName) {
    return deplReg.undeploy(extName)
  }
  function enableExtension<Def extends ExtDef>({ ext, pkgInfo }: { ext: Ext<Def>; pkgInfo: PkgInfo }) {
    const extId = ext.id
    const env = extEnv(extId)
    const $msg$ = new Subject<IMessage<any>>()
    const push: PushMessage = bound => destExtId => path => (data, _opts) => {
      // console.log('PUSH', { bound, destExtId, path, data, _opts })
      const opts: PushOptions = {
        parent: null,
        primary: false,
        sub: false,
        ..._opts,
      }
      const pointer = joinPointer(destExtId, path)
      const [, destRegDeployable] = deplReg.assertDeployed(destExtId)
      if (opts.primary) {
        const { extName: pushToExtName } = splitExtId(destExtId)
        const expPnt = EXPOSED_POINTERS_REG[pushToExtName]?.[path]
        console.log({ EXPOSED_POINTERS_REG, pushToExtName, destExtId, path })
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
      assertMeEnabled()
      const msg: MessagePush /* <typeof bound, Def, DestDef, typeof path>  */ = {
        id: newMsgId(),
        source: extId,
        bound,
        pointer,
        data: data as any,
        parentMsgId,
        sub: opts.sub,
        // managedBy: null,
        activeDest: destRegDeployable.ext.id,
      }

      setTimeout(() => $MAIN_MSGS$.next(msg), 10)
      return msg as any
    }

    const getExt: Shell['getExt'] = extId => {
      const regDeployable = deplReg.getCompat(extId)

      const onExtDeployable: OnExtDeployable<ExtDef> | undefined = regDeployable && {
        lib: regDeployable.lib,
        at: regDeployable.at,
        pkgInfo: regDeployable.pkgInfo,
        version: splitExtId(regDeployable.ext.id).version,
      }
      const onExtDeployment: OnExtDeployment<ExtDef> | undefined = regDeployable?.deployment && {
        at: regDeployable.deployment.at,
        inst: regDeployable.deployment.inst,
        lib: regDeployable.lib,
        pkgInfo: regDeployable.pkgInfo,
        version: splitExtId(regDeployable.ext.id).version,
      }

      if (!(onExtDeployable && onExtDeployment)) {
        throw new Error(
          `onExt: should never happen: ${extId} missing ${onExtDeployable ? '' : 'onExtDeployable'} ${
            onExtDeployment ? '' : 'onExtDeployment'
          }`,
        )
      }

      const extDepl = [onExtDeployable, onExtDeployment] as ExtDepl<ExtDef>
      return extDepl as any
    }

    const onExt: Shell['onExt'] = (extId, cb) => {
      const match = matchMessage<KernelExt>()
      const matchExtIdSplit = splitExtId(extId)
      const subscription = pipedMessages$.subscribe(msg => {
        const targetExtIdSplit = splitPointer(msg.pointer)

        if (
          targetExtIdSplit.extName === matchExtIdSplit.extName &&
          isVerBWC(targetExtIdSplit.version, matchExtIdSplit.version) &&
          (match(msg, 'kernel.core@0.1.10::ext/deployed') ||
            match(msg, 'kernel.core@0.1.10::ext/undeployed') ||
            match(msg, 'kernel.core@0.1.10::ext/enabled') ||
            match(msg, 'kernel.core@0.1.10::ext/disabled'))
        ) {
          if (!msg) cb(getExt(extId))
        }
      })
      return subscription
    }

    const onExtDeployed: Shell['onExtDeployed'] = (extId, cb) => {
      let cleanup: void | (() => void) = undefined
      const subscription = onExt(extId, ([extDeployable, extDeployment]) => {
        if (!extDeployment) {
          return cleanup?.()
        }
        const onExtDeployment: OnExtDeployment<ExtDef> = {
          at: extDeployment.at,
          pkgInfo: extDeployment.pkgInfo,
          inst: extDeployment.inst,
          version: extDeployment.version,
          lib: extDeployable.lib,
        }
        cleanup = cb(onExtDeployment)
      })
      return subscription
    }
    const onExtEnabled: Shell['onExtEnabled'] = (extId, cb) => {
      let cleanup: void | (() => void) = undefined
      const subscription = onExt(extId, ([extDeployable]) => {
        if (!extDeployable) {
          return cleanup?.()
        }
        const onExtDeployable: OnExtDeployable<ExtDef> = {
          at: extDeployable.at,
          pkgInfo: extDeployable.pkgInfo,
          version: extDeployable.version,
          lib: extDeployable.lib,
        }
        cleanup = cb(onExtDeployable as any)
      })
      return subscription
    }

    const shell: Shell<Def> = {
      extId,
      env,
      msg$: $msg$.asObservable(),
      // removing "as any" generates  "Error: Debug Failure. No error for last overload signature" ->https://github.com/microsoft/TypeScript/issues/33133  ... related:https://github.com/microsoft/TypeScript/issues/37974
      emit: path => (data, opts) => (push as any)('out')(extId)(path)(data, opts),
      send: extId => path => (data, opts) => (push as any)('in')(extId)(path)(data, opts),
      push,
      libOf: deplReg.lib,
      onExtDeployed,
      onExtEnabled,
      getExt,
      onExt,
      pkgInfo,
    }

    const regDeployable = deplReg.enable<Def>({
      pkgInfo,
      ext,
      shell,
      $msg$,
    })

    return regDeployable
    function assertMeEnabled() {
      deplReg.assertEnabled(extId)
    }
  }
  function deployExtension({ extId }: { extId: ExtId }) {
    const deployable = deplReg.assertEnabled(extId)
    const tearDown = pipedMessages$.subscribe(deployable.$msg$)
    const { extName } = splitExtId(extId)

    const expose: ExposePointers = expPnt => {
      EXPOSED_POINTERS_REG[extName] = expPnt
    }

    const deploymentShell: DeploymentShell = {
      expose,
      tearDown,
    }

    return deplReg.deploy({ extId, deploymentShell })
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
      .filter((_): _ is RegDeployable => !!_)
  }
}

function newMsgId() {
  return Math.random().toString(36).substring(2)
}
