import { isVerBWC, splitExtId } from '../k/pointer'
import type { DeploymentActionResult, ExtDef, ExtDeployable, ExtDeployment, ExtId, ExtName } from '../types'

export type ExtLocalDeploymentRegistry = ReturnType<typeof createLocalDeploymentRegistry>

export const createLocalDeploymentRegistry = () => {
  const reg: {
    [Name in ExtName]: ExtDeployment
  } = {}

  return {
    get,
    set,
    unset,
    assert,
    assertReady,
    start,
    stop,
    ready,
    reg,
    isReady,
  }

  function get<Def extends ExtDef>(extId: ExtId<Def>) {
    const { extName, version } = splitExtId(extId)
    const deployment: undefined | ExtDeployment<Def> = reg[extName] as any
    if (!deployment) {
      return undefined
    }
    const { version: deployedVersion } = splitExtId(deployment.ext.id)
    const isCompat = isVerBWC(deployedVersion, version)
    // console.log({
    //   isCompat,
    //   deployedVersion,
    //   version,
    //   extName,
    //   deployedId: deployment?.ext.id,
    //   deployedSt: deployment?.status,
    // })
    return isCompat ? deployment : undefined
  }

  function set<Def extends ExtDef>(deployment: ExtDeployment<Def>) {
    const { extName } = splitExtId(deployment.ext.id)
    reg[extName] = deployment as any
  }

  function unset<Def extends ExtDef>(extName: ExtName<Def>) {
    delete reg[extName]
  }

  function assert<Def extends ExtDef>(extId: ExtId<Def>) {
    const deployment = get<Def>(extId)
    if (!deployment) {
      throw new Error(`assert: no extension matching [${extId}]`)
    }
    return deployment
  }

  function assertReady<Def extends ExtDef>(extId: ExtId<Def>) {
    const deployment = assert<Def>(extId)
    if (deployment.status !== 'ready') {
      throw new Error(`assertReady: extension matching [${extId}] not ready, ${deployment.status} instead`)
    }
    return deployment
  }
  function isReady<Def extends ExtDef>(extId: ExtId<Def>) {
    const deployment = get<Def>(extId)
    return deployment?.status === 'ready' || deployment?.status === 'starting'
  }
  function start<Def extends ExtDef>(deployable: ExtDeployable<Def>): DeploymentActionResult<Def> {
    const currDeployment = get(deployable.ext.id)
    if (currDeployment) {
      return { done: false, currDeployment: currDeployment as any }
    }
    const deployment: ExtDeployment<Def> = {
      ...deployable,
      at: new Date(),
      status: 'starting',
    }
    set(deployment)

    return { done: true, deployment }
  }

  function stop<Def extends ExtDef>(extId: ExtId<Def>): DeploymentActionResult<Def> {
    const currDeployment = get(extId)
    if (currDeployment?.status !== 'ready') {
      return { done: false, currDeployment: currDeployment as any }
    }
    const deployment: ExtDeployment<Def> = {
      ...currDeployment,
      at: new Date(),
      status: 'stopping',
    } as any
    set(deployment)
    return { done: true, deployment }
  }

  function ready<Def extends ExtDef>(extId: ExtId<Def>): DeploymentActionResult<Def> {
    const currDeployment = get(extId)
    if (currDeployment?.status !== 'starting') {
      return { done: false, currDeployment: currDeployment as any }
    }

    const deployment: ExtDeployment<Def> = {
      ...currDeployment,
      status: 'ready',
      at: new Date(),
    } as any
    set(deployment)
    return { done: true, deployment }
  }
}
