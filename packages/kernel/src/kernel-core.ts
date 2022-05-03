import { DepGraph } from 'dependency-graph'
import { interval, map, mergeMap, of, share, Subject, take } from 'rxjs'
import { depGraphAddNodes } from './dep-graph'
import { matchMessage } from './k/message'
import { isExtIdBWC, joinPointer, splitExtId } from './k/pointer'
import { pubAll } from './k/sub'
import { createLocalDeploymentRegistry } from './registry'
import type {
  DataMessage,
  DepGraphData,
  DeploymentShell,
  ExposedPointerMap,
  ExposePointers,
  Ext,
  ExtDef,
  ExtDeployment,
  ExtId,
  ExtName,
  KernelExt,
  MessagePush,
  MWFn,
  PkgDiskInfo,
  PkgInfo,
  PushMessage,
  PushOptions,
  RawExtEnv,
  RegDeployment,
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

  const deplReg = createLocalDeploymentRegistry()
  const depGraph = new DepGraph<DepGraphData>()
  const $MAIN_MSGS$ = new Subject<DataMessage<any>>()
  const pipedMessages$ = $MAIN_MSGS$.pipe(
    // tap(msg => console.log('++++++msg', msg)),
    mergeMap(msg => {
      const orderDepl = depOrderDeployments()
      // console.log({ orderDepl: orderDepl.map(_ => _.ext.id), msg })
      return orderDepl
        .map(({ mw }) => mw)
        .filter((mw): mw is MWFn => !!mw)
        .reduce(($, mwFn) => $.pipe(mergeMap(mwFn)), of(msg))
    }),
    // tap(msg => setImmediate(() => console.log('*******msg', msg))),
    share(),
  )

  const kernelExt: Ext<KernelExt> = {
    id: kernelExtId,
    displayName: 'K',
    description: 'K',
    requires: [],
    enable: shell => {
      shell.expose({
        'testSub/sub': { validate: () => ({ valid: true, msg: 'no good' }) },
      })

      return {
        mw: msg => of(msg),
        deploy(
          {
            /* , tearDown  */
          },
        ) {
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
  const KDeployment = deployExtension<KernelExt>({ ext: kernelExt, pkgInfo: kernelPkgInfo })

  return {
    deployExtension,
    undeployExtension,
    depOrderDeployments,
    extEnv,
    global_env,
    deplReg,
    depGraph,
    $MAIN_MSGS$,
    pipedMessages$,
    KDeployment,
  }

  function deployExtension<Def extends ExtDef>({
    ext,
    pkgInfo,
    deployWith,
  }: {
    ext: Ext<Def>
    pkgInfo: PkgInfo | PkgDiskInfo
    deployWith?: (shell: Shell<Def>, deplShell: DeploymentShell) => ExtDeployment<Def>
  }) {
    const extId = ext.id
    const extIdSplit = splitExtId(ext.id)
    const env = extEnv(extId)
    const $msg$ = new Subject<DataMessage<any>>()

    const push = pushMsg<Def>(extId)
    const getExt: Shell['getExt'] = deplReg.get as any

    const onExt: Shell['onExt'] = (extId, cb) => {
      const match = matchMessage<KernelExt>()
      // console.log('onExt', extId)
      const subscription = pipedMessages$.subscribe(msg => {
        // console.log('onExt', msg)

        if (
          !(
            (match(msg, 'kernel.core@0.1.10::ext/deployed') || match(msg, 'kernel.core@0.1.10::ext/undeployed')) &&
            isExtIdBWC(msg.data.extId, extId)
          )
        ) {
          return
        }

        cb(getExt(extId))
      })
      return subscription
    }

    const onExtInstance: Shell['onExtInstance'] = (extId, cb) => {
      let cleanup: void | (() => void) = undefined
      const subscription = onExt(extId, regDeployment => {
        if (!regDeployment?.inst) {
          return cleanup?.()
        }
        cleanup = cb(regDeployment.inst, regDeployment as any)
      })
      return subscription
    }

    const onExtDeployment: Shell['onExtDeployment'] = (extId, cb) => {
      let cleanup: void | (() => void) = undefined
      const subscription = onExt(extId, regDeployment => {
        if (!regDeployment) {
          return cleanup?.()
        }
        cleanup = cb(regDeployment as any)
      })
      return subscription
    }

    const libOf: Shell['libOf'] = id => deplReg.get(id)?.lib

    const expose: ExposePointers = expPnt => {
      EXPOSED_POINTERS_REG[extIdSplit.extName] = expPnt
    }

    const shell: Shell<Def> = {
      extId,
      env,
      msg$: $msg$.asObservable(),
      // removing "as any" generates  "Error: Debug Failure. No error for last overload signature" ->https://github.com/microsoft/TypeScript/issues/33133  ... related:https://github.com/microsoft/TypeScript/issues/37974
      emit: path => (data, opts) => (pushMsg as any)('out')(extId)(path)(data, opts),
      send: extId => path => (data, opts) => (pushMsg as any)('in')(extId)(path)(data, opts),
      push,
      libOf,
      onExtInstance,
      onExtDeployment,
      getExt,
      onExt,
      pkgInfo,
      expose,
    }

    const tearDown = pipedMessages$.subscribe($msg$)

    const deploymentShell: DeploymentShell = {
      tearDown,
    }

    const extDeployable = ext.enable(shell)

    let extDeployment: ExtDeployment<Def> = { inst: undefined }
    if (deployWith) {
      extDeployment = deployWith(shell, deploymentShell)
    } else {
      extDeployment = extDeployable.deploy(deploymentShell)
    }
    const pkgDiskInfo = 'rootDir' in pkgInfo ? pkgInfo : undefined
    const depl: RegDeployment<Def> = {
      ...{ at: new Date(), ext, $msg$, pkgDiskInfo },
      ...deploymentShell,
      ...shell,
      ...extDeployment,
      ...extDeployable,
    }

    setImmediate(() => {
      /* const msg = */ pushMsg<KernelExt>('kernel.core@0.1.10')('out')<KernelExt>('kernel.core@0.1.10')(
        'ext/deployed',
      )({
        extId,
      })
      // console.log('ext/deployed msg', msg)
    })

    deplReg.deploy<Def>({ depl })
    return depl
  }
  function pushMsg<Def extends ExtDef>(extId: ExtId<Def>): PushMessage<Def> {
    return bound => destExtId => path => (data, _opts) => {
      // console.log('PUSH', { bound, destExtId, path, data, _opts })
      const opts: PushOptions = {
        parent: null,
        primary: false,
        sub: false,
        ..._opts,
      }
      const pointer = joinPointer(destExtId, path)
      const destRegDeployment = deplReg.assertDeployed(destExtId)
      if (opts.primary) {
        const { extName: pushToExtName } = splitExtId(destExtId)
        const expPnt = EXPOSED_POINTERS_REG[pushToExtName]?.[path]
        // console.log({ EXPOSED_POINTERS_REG, pushToExtName, destExtId, path })
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
      deplReg.assertDeployed(extId) // assert me deployed

      const msg: MessagePush /* <typeof bound, Def, DestDef, typeof path>  */ = {
        id: newMsgId(),
        source: extId,
        bound,
        pointer,
        data: data as any,
        parentMsgId,
        sub: opts.sub,
        // managedBy: null,
        activeDest: destRegDeployment.ext.id,
      }

      setTimeout(() => $MAIN_MSGS$.next(msg), 10)
      return msg as any
    }
  }

  function extEnv(extId: ExtId) {
    //FIXME: should check version compat ?
    const { extName /* , version  */ } = splitExtId(extId)
    // console.log('extEnv', extId, extName, global_env, global_env[extName])
    return global_env[extName]
  }

  function undeployExtension(extName: ExtName) {
    const wasDeployment = deplReg.undeploy(extName)
    wasDeployment?.$msg$.complete()
    wasDeployment?.tearDown.unsubscribe()
    return wasDeployment
  }

  function depOrderDeployments() {
    return depGraph
      .overallOrder()
      .reverse()
      .map(pushToExtName => {
        const deployment = deplReg.getByName(`${pushToExtName}@*`)
        if (!deployment) {
          //TODO: WARN? THROW? IGNORE?
          return
        }
        return deployment
      })
      .filter((_): _ is RegDeployment => !!_)
  }
}

function newMsgId() {
  return Math.random().toString(36).substring(2)
}
