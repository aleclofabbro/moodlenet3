import { isVerBWC, splitExtId } from '../k/pointer'
import type { DeploymentActionResult, ExtDef, ExtDeployment, ExtId, ExtLCStop, ExtName, ExtPkgInfo } from '../types'

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
    assertDeployed,
    deploying,
    undeploying,
    deploy,
    reg,
  }

  function get<Def extends ExtDef>(extId: ExtId<Def>) {
    const { extName, version } = splitExtId(extId)
    const deployment: undefined | ExtDeployment<Def> = reg[extName]
    if (!deployment) {
      return undefined
    }
    const { version: deployedVersion } = splitExtId(deployment.ext.id)
    const compat = isVerBWC(deployedVersion, version)
    return compat ? deployment : undefined
  }

  function set<Def extends ExtDef>(deployment: ExtDeployment<Def>) {
    const { extName } = splitExtId(deployment.ext.id)
    reg[extName] = deployment
  }

  function unset<Def extends ExtDef>(extName: ExtName<Def>) {
    delete reg[extName]
  }

  function assert<Def extends ExtDef>(extId: ExtId<Def>) {
    const deployment = get<Def>(extId)
    if (!deployment) {
      throw new Error(`no extension matching [${extId}]`)
    }
    return deployment
  }

  function assertDeployed<Def extends ExtDef>(extId: ExtId<Def>) {
    const deployment = assert<Def>(extId)
    if (deployment.status !== 'deployed') {
      throw new Error(`extension matching [${extId}] not deployed`)
    }
    return deployment
  }

  function deploying<Def extends ExtDef>(extPkgInfo: ExtPkgInfo<Def>): DeploymentActionResult<Def> {
    const currDeployment = get(extPkgInfo.ext.id)
    if (currDeployment) {
      return { done: false, currDeployment }
    }
    const deployment: ExtDeployment<Def> = {
      ...extPkgInfo,
      startAt: new Date(),
      status: 'deploying',
      stop: undefined,
    }
    set(deployment)

    return { done: true, deployment }
  }

  function undeploying<Def extends ExtDef>(extId: ExtId<Def>): DeploymentActionResult<Def> {
    const currDeployment = get(extId)
    if (!(currDeployment?.status === 'deployed')) {
      return { done: false, currDeployment }
    }
    const deployment: ExtDeployment<Def> = {
      ...currDeployment,
      stopAt: new Date(),
      status: 'undeploying',
    }
    set(deployment)
    return { done: true, deployment }
  }

  function deploy<Def extends ExtDef>(extId: ExtId<Def>, stop: ExtLCStop): DeploymentActionResult<Def> {
    const currDeployment = get(extId)
    if (!(currDeployment?.status === 'deploying')) {
      return { done: false, currDeployment }
    }

    const deployment: ExtDeployment<Def> = {
      ...currDeployment,
      status: 'deployed',
      stop,
    }
    set(deployment)
    return { done: true, deployment }
  }
}
