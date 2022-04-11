import type { PortShell, ShellLib } from './shell'
import type { RootTopo } from './topo'

export type ExtName = string
export type ExtVersion = string
export type ExtensionIdObj<Name extends ExtName = ExtName, Version extends ExtVersion = ExtVersion> = {
  name: Name
  version: Version
}
export type ExtIdOf<ExtDef extends ExtensionDef> = Pick<ExtDef, keyof ExtensionIdObj>
export type ExtNameOf<ExtDef extends ExtensionDef> = ExtDef['name']
export type ExtEnv = unknown

export type ExtensionDef<
  Name extends ExtName = ExtName,
  Version extends ExtVersion = ExtVersion,
  ExtRootTopo extends RootTopo = RootTopo,
> = ExtensionIdObj<Name, Version> & {
  ports: ExtRootTopo
}
export type ExtLCStart = (startArg: { shell: PortShell; env: Record<string, any>; lib: ShellLib }) => Promise<ExtLCStop>
export type ExtLCStop = () => Promise<void>
export type ExtImpl = {
  start: ExtLCStart
  description?: string
}

export type ExtImplExports = { module: NodeModule; extensions: Record<ExtId<ExtensionDef>, ExtImpl> }
export type ExtId<Ext extends ExtensionDef = ExtensionDef> = `${Ext['name']}@${Ext['version']}` //`;)
