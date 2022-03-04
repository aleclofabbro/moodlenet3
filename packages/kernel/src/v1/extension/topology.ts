import { createMessage, pushMessage } from '../message'
import { PortAddress } from '../port-address/types'
import { Session } from '../types'
import {
  ExtensionId,
  Gate,
  GatesTopology,
  Port,
  PortMeta,
  PortsTopology,
  RawGate,
  RawPort,
  RawShellGate,
  ShellGate,
  ShellGatesTopology,
  WithGateMeta,
} from './types'

export const shellGatesTopologyOf = <GatesTopo extends GatesTopology>(
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
// const PORT_META_SYM = Symbol()

export function portGates<PortsTopo extends PortsTopology>(
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
          parentMsgId: null,
        })
        pushMessage(message)
        //const shell = makeShell({ cwAddress: thisGateExtAddress, message })
        // port(shell)
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
