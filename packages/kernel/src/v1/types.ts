import { ExtensionDef, IsGateMsg, ShellGatedExtension } from './extension/types'
import { GetMsg, Message } from './message/types'
import { PortAddress } from './port-address/types'

// }

export type Obj = any //Record<string, any>

export type PostOpts = {}

export type ExtensionUnavailable = undefined

export type ShellLookup = <Ext extends ExtensionDef>(
  name: Ext['name']
) => ShellGatedExtension<Ext> | ExtensionUnavailable

export type PostOutcome = void

export type PortListener = (shell: PortShell<Obj>) => void
export type Listen = (_: PortListener) => Unlisten
export type Unlisten = () => void
export type PortShell<Payload = unknown> = {
  message: Message<Payload>
  lookup: ShellLookup
  env: any
  listen: Listen
  isMsg: IsGateMsg
  getMsg: GetMsg
  cwAddress: PortAddress
}

export type Session = {
  user: User
}

export type User = {}
