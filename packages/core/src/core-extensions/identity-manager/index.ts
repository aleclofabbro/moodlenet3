import { ExtensionDef, RpcTopo } from '@moodlenet/kernel'

export type Get = <T>() => Promise<T | undefined>
export type Set = <T>(cache: T) => Promise<{ old: T | undefined }>

export type MoodlenetIdentityManagerPorts = {
  ____: RpcTopo<Set>
}

export type MoodlenetIdentityManagerExt = ExtensionDef<
  'moodlenet.identity-manager',
  '0.0.1',
  MoodlenetIdentityManagerPorts
>
