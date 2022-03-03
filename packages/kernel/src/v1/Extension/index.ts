import { createRequire } from 'module'
import { pkgInfoOf } from './pkg-info'
import type {
  ExtensionDef,
  ExtensionId,
  Gate,
  GatesTopology,
  GetMsg,
  IsGateMsg,
  Message,
  Obj,
  PkgInfo,
  Port,
  PortAddress,
  PortListener,
  PortMeta,
  PortShell,
  PortsTopology,
  PortTopologyNode,
  RawGate,
  RawPort,
  RawShellGate,
  Session,
  ShellGate,
  ShellGatedExtension,
  ShellGatesTopology,
  ShellLookup,
  WithGateMeta,
} from './types'

const cfgPath = process.env.MN_EXT_ENV ?? `${process.cwd()}/mn-kernel-config`
// delete process.env.MN_EXT_ENV
let globalEnv: any = {}
try {
  globalEnv = require(cfgPath)
} catch (e) {
  console.warn(`couldn't require config:${cfgPath}, setting to {}`)
  console.warn(e)
}
const extEnv = (extName: string) => globalEnv[extName]

type PkgMng = any /*  { npmcli: {
  install()...
} } */
type KernelEnv = {
  coreExts: string[]
  activateExts: string[]
}
export const kernelExtId: ExtensionId = {
  name: '@moodlenet/kernel',
  version: '1.0.0',
}
//TODO: returns something to pkgmng ?
export const boot = (pkgMng?: PkgMng) => {
  Extension(module, {
    ...kernelExtId,
    ports: {
      activate() {},
      deactivate() {},
    },
  })

  const extRequire = createRequire(pkgMng?.nodeModulesDir ?? process.cwd())
  const kernelEnv: KernelEnv = {
    coreExts: [],
    activateExts: [],
    ...extEnv(kernelExtId.name),
  }

  kernelEnv.coreExts.forEach((_) => extRequire(_))
  kernelEnv.activateExts.forEach((_) => extRequire(_))

  Object.values(extensionRegistry)
    .sort((a, b) =>
      a.id.name === kernelExtId.name
        ? -1
        : b.id.name === kernelExtId.name
        ? 1
        : 0
    )
    .forEach((extReg) => {
      console.log(
        `** KERNEL: activating ${extReg.id.name}@${extReg.id.version} - [${extReg.pkgInfo.dir}]`
      )
      extReg.active = true
      pushMessage(
        createMessage({
          payload: {},
          session: { user: {} },
          source: { extId: kernelExtId, path: [] },
          target: {
            extId: extReg.id,
            path: ['activate'],
          },
        })
      )
    })

  // const installExt = async ({ pkgs }: { pkgs: string[] }) => {
  //   pkgMng?.npmcli.install(pkgs)
  //   return pkgs.map((pkg) => extRequire(pkg))
  // }

  setTimeout(() => {
    pushMessage(
      createMessage({
        payload: {},
        session: { user: {} },
        source: { extId: kernelExtId, path: [] },
        target: {
          extId: { name: '@moodlenet/pri-http', version: '1.0.0' },
          path: ['deactivate'],
        },
      })
    )
  }, 2000)
}

const pushMessage = (message: Message) => {
  const { target, source } = message
  const sourceExt = getRegisteredExtension(source.extId.name)
  const targetExt = getRegisteredExtension(target.extId.name)

  if (!(targetExt && sourceExt)) {
    //TODO: WARN
    return
  }

  msgListeners.forEach(({ extId, listener }) => {
    const listenerExt = getRegisteredExtension(extId.name)
    if (!listenerExt?.active) {
      //TODO: WARN
      return
    }
    const shell = makeShell({
      cwAddress: { extId, path: [] },
      message,
    })
    listener(shell)
  })

  const targetPortTopoNode: PortTopologyNode | undefined =
    target.path.reduce<any>(
      (portTopoNode, nextProp) => (portTopoNode ?? {})[nextProp],
      targetExt.def.ports
    )
  if ('function' !== typeof targetPortTopoNode) {
    //TODO: WARN or throw ?
    return
  }
  //TODO: after this narrowing targetPortTopoNode gets typed as "never" :\ (same as for portGates)

  const targetPort: Port<any> = targetPortTopoNode
  //TODO: WARN NO Guard
  try {
    targetPort.meta?.guard?.(message)
  } catch (guardError) {
    console.error(`
message guard failed
message #${message.id} 
from ${message.source.extId}#${message.source.path.join('::')}
to ${message.target.extId}#${message.target.path.join('::')}
msg ${String(guardError)}
    `)
    throw guardError
  }
  const shell = makeShell({ message, cwAddress: target })
  targetPort(shell)
}
function makeShell<P extends Obj>({
  message,
  cwAddress,
}: {
  message: Message<P>
  cwAddress: PortAddress
}): PortShell<P> {
  const ext = assertRegisteredExtension(cwAddress.extId.name)
  const listen = (listener: PortListener) => addListener(ext.id, listener)

  const getMsg: GetMsg = (gate) => (isMsg(gate, message) ? message : undefined)
  const lookup = lookupFor(message.session, message.source)
  const env = extEnv(ext.id.name)
  return {
    env,
    lookup,
    message,
    listen,
    isMsg,
    getMsg,
  }
}

const addressEquals = (a: PortAddress, b: PortAddress) =>
  a.extId.name === b.extId.name && a.path.join(':::') === b.path.join(':::')
const isMsg: IsGateMsg = <Payload>(
  { meta: { address } }: WithGateMeta,
  msg: Message
): msg is Message<Payload> => addressEquals(address, msg.target)

const addListener = (extId: ExtensionId, listener: PortListener) => {
  const listenerRecord = { extId, listener }
  msgListeners = [...msgListeners, listenerRecord]
  return () => {
    msgListeners = msgListeners.filter((_) => _ !== listenerRecord)
  }
}

type PortListenerRecord = { listener: PortListener; extId: ExtensionId }
let msgListeners: PortListenerRecord[] = []

const shellGatesTopologyOf = <GatesTopo extends GatesTopology>(
  gates: GatesTopo,
  session: Session,
  source: PortAddress
): ShellGatesTopology<GatesTopo> =>
  Object.entries(gates).reduce((shellgates, [nodename, gateTopo]) => {
    if ('function' !== typeof gateTopo) {
      return {
        ...shellgates,
        [nodename]: shellGatesTopologyOf(gateTopo, session, source),
      }
    }
    const gate: Gate<any> = gateTopo

    const shellGate: ShellGate<any> = (_) => gate({ session, source })(_)
    shellGate.meta = gate.meta

    return {
      ...shellgates,
      [nodename]: shellGate,
    }
  }, {} as ShellGatesTopology<GatesTopo>)

const lookupFor =
  (session: Session, source: PortAddress): ShellLookup =>
  (name) => {
    const ext = getRegisteredExtension(name)
    if (!ext) {
      return
    }
    const shellGatesTopology = shellGatesTopologyOf(ext.gates, session, source)
    const shellGatedExtension: ShellGatedExtension = {
      gates: shellGatesTopology,
      id: ext.id,
    }
    return shellGatedExtension
  }
type ExtensionRegistryRecord<ExtDef extends ExtensionDef> = {
  def: ExtDef
  active: boolean
  env: any
  id: ExtensionId
  gates: GatesTopology<ExtDef['ports']>
  pkgInfo: PkgInfo
}
const extensionRegistry: {
  [pkgName: string]: ExtensionRegistryRecord<ExtensionDef>
} = {}
function getRegisteredExtension(pkgName: string) {
  return extensionRegistry[pkgName]
}

function assertRegisteredExtension(pkgName: string) {
  const ext = getRegisteredExtension(pkgName)
  if (!ext) {
    throw new Error(`extension package ${pkgName} not registered`)
  }
  return ext
}

function assertNotRegisteredExtension(pkgName: string) {
  const ext = getRegisteredExtension(pkgName)
  if (ext) {
    throw new Error(`extension package ${pkgName} already registered`)
  }
}

// function registeredExtensionOf(node_module: NodeModule) {
//   const pkgInfo = pkgInfoOf(node_module)
//   if (!pkgInfo?.json.name) {
//     return undefined
//   }
//   return getRegisteredExtension(pkgInfo?.json.name)
// }

function registerExtension({
  def,
  pkgInfo,
}: {
  def: ExtensionDef
  pkgInfo: PkgInfo
}) {
  const pkgName = pkgInfo.json.name
  assertNotRegisteredExtension(pkgName)
  const env = extEnv(pkgName)
  const id: ExtensionId = { name: def.name, version: def.version }
  const gates = portGates(id, def.ports, [])
  extensionRegistry[pkgName] = { def, id, active: false, env, pkgInfo, gates }
}

// const PORT_META_SYM = Symbol()
function portGates<PortsTopo extends PortsTopology>(
  extId: ExtensionId,
  ports: PortsTopo,
  path: string[]
): GatesTopology<PortsTopo> {
  if ('object' !== typeof ports) {
    throw new Error(
      `Extension topology may only contain structure and Port functions, found [${path.join(
        '::'
      )}]:${typeof ports}`
    )
  }
  const gates = Object.entries(ports).reduce((gates, [nodeName, portNode]) => {
    if (!portNode) {
      //TODO: WARN
      return gates
    }
    const nodePath = [...path, nodeName]

    if ('function' !== typeof portNode) {
      return {
        ...gates,
        [nodeName]: portGates(extId, portNode, nodePath),
      }
    }
    //TODO: after this narrowing portNode gets typed as "never" :\ (same as for targetPortTopoNode)

    const port: Port<any> = portNode

    const withTopoMetaObj: WithGateMeta = {
      meta: {
        address: { extId, path: nodePath },
        guard: port.meta?.guard,
      },
    }
    const withTopoMeta = <T>(_: T): T & WithGateMeta =>
      Object.assign(_, withTopoMetaObj)

    const rawgate: RawGate<unknown> = ({ session, source }) => {
      const rawShellGate: RawShellGate<unknown> = ({ payload }) => {
        const thisGateExtAddress: PortAddress = { extId, path: nodePath }
        const message = createMessage({
          payload,
          target: thisGateExtAddress,
          session,
          source,
        })
        const shell = makeShell({ cwAddress: thisGateExtAddress, message })
        port(shell)
        return message
      }
      const shellGate: ShellGate<unknown> = withTopoMeta(rawShellGate)
      return shellGate
    }
    const gate: Gate<unknown> = withTopoMeta(rawgate)
    const gatesTopo: GatesTopology<any> = {
      //CHECK: forced generic arg to any
      ...gates,
      [nodeName]: gate,
    }
    return gatesTopo
  }, {} as GatesTopology<PortsTopo>)
  return gates
}

export const ExtPort = <Payload>(
  meta: PortMeta,
  raw: RawPort<Payload>
): Port<Payload> => {
  return Object.assign(raw, { meta })
}

function newId() {
  return Math.random().toString(36).substring(2)
}
function createMessage<P extends Obj>({
  payload,
  source,
  target,
  session,
}: {
  session: Session
  payload: P
  source: PortAddress
  target: PortAddress
}): Message<P> {
  return {
    id: newId(),
    ctx: {},
    payload,
    session,
    source,
    target,
  }
}

// function assertRegisteredExtensionOf(node_module: NodeModule) {
//   const ext = registeredExtensionOf(node_module)

//   if (!ext) {
//     throw new Error(
//       `No registered Extension for module ${node_module.filename}`
//     )
//   }

//   return ext
// }

export function Extension<ExtDef extends ExtensionDef>(
  node_module: NodeModule,
  def: ExtDef
) {
  const pkgInfo = pkgInfoOf(node_module)
  if (def.name !== pkgInfo.json.name) {
    throw new Error(
      `package.json name and provided extension name must exactly match !`
    )
  }
  if (def.version !== pkgInfo.json.version) {
    throw new Error(
      `package.json version and provided extension version must exactly match !`
    )
  }

  registerExtension({ pkgInfo, def })
}
