import { Subject } from 'rxjs'
import { isVerBWC, splitExtId } from '../k/pointer'
import type {
  DeploymentShell,
  Ext,
  ExtDef,
  ExtId,
  ExtName,
  IMessage,
  PkgInfo,
  RegDeployable,
  RegDeployment,
  Shell,
} from '../types'

export type ExtLocalDeployableRegistry = ReturnType<typeof createLocalDeployableRegistry>

export const createLocalDeployableRegistry = () => {
  const reg: {
    [Name in ExtName]: RegDeployable
  } = {}

  return {
    get,
    enable,
    disable,
    assertEnabled,
    undeploy,
    assertDeployed,
    isDeployed,
    reg,
    deploy,
    lib,
    getCompat,
  }

  function getCompat(extId: ExtId) {
    const { extName, version } = splitExtId(extId)
    const regDeployable = get(extName)
    if (!regDeployable) {
      return undefined
    }
    const { version: deployedVersion } = splitExtId(regDeployable.ext.id)
    const isCompat = isVerBWC(deployedVersion, version)
    // debug()
    return isCompat ? regDeployable : undefined

    // function debug() {
    //   console.log({
    //     isCompat,
    //     deployedVersion,
    //     version,
    //     extName,
    //     deployedId: deployment?.ext.id,
    //   })
    // }
  }

  function get(extName: ExtName) {
    const regDeployable = reg[extName]
    return regDeployable
  }

  function lib(extId: ExtId) {
    const regDeployable = getCompat(extId)
    return regDeployable?.deployment?.inst
  }

  function enable<Def extends ExtDef>({
    ext,
    pkgInfo,
    shell,
    $msg$,
  }: {
    pkgInfo: PkgInfo
    ext: Ext<Def>
    shell: Shell<Def>
    $msg$: Subject<IMessage<any>>
  }) {
    const { extName } = splitExtId(ext.id)
    const currDeployable = reg[extName]
    if (currDeployable) {
      throw new Error(`can't register ${ext.id} as it's already present in registry (${currDeployable.ext.id})`)
    }
    const deployable = ext.enable(shell)
    const regDeployable: RegDeployable<Def> = { ...deployable, ext, pkgInfo, shell, $msg$, at: new Date() }
    return (reg[extName] = regDeployable as any)
  }

  function deploy({ deploymentShell, extId }: { extId: ExtId; deploymentShell: DeploymentShell }) {
    const currRegDeployable = assertEnabled(extId)
    if (currRegDeployable.deployment) {
      throw new Error(`can't deploy ${extId} as it's already deployed since ${currRegDeployable.deployment.at}`)
    }
    const deployment = currRegDeployable.deploy(deploymentShell)
    const regDeployment: RegDeployment = {
      at: new Date(),
      ...deploymentShell,
      ...deployment,
      inst: deployment.inst ?? undefined,
    }

    return (currRegDeployable.deployment = regDeployment)
  }

  function undeploy(extName: ExtName) {
    const currDeployable = get(extName)
    currDeployable?.deployment?.tearDown.unsubscribe()
    delete currDeployable?.deployment
    return currDeployable
  }

  function disable(extName: ExtName) {
    const currDeployable = undeploy(extName)
    currDeployable?.$msg$.complete()
    delete reg[extName]
    return currDeployable
  }

  function assertEnabled(extId: ExtId) {
    const currDeployable = getCompat(extId)
    if (!currDeployable) {
      throw new Error(`assert: no compat extension matching [${extId}]`)
    }
    return currDeployable
  }

  function assertDeployed(extId: ExtId) {
    const currDeployable = assertEnabled(extId)
    if (!currDeployable.deployment) {
      throw new Error(`assertDeployed: extension matching [${extId}] not deployed`)
    }
    return [currDeployable.deployment, currDeployable] as const
  }

  function isDeployed(extId: ExtId) {
    const currDeployable = assertEnabled(extId)
    return !!currDeployable.deployment
  }
}
