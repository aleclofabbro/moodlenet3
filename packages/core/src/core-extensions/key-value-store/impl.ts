import type { ExtensionDef, ExtId, RpcTopo } from '@moodlenet/kernel'

export type MoodlenetKeyValueStoreExtImpl = ExtensionDef<
  'moodlenet.key-value-store-impl',
  '0.0.1',
  {
    get: RpcTopo<Get>
    put: RpcTopo<Put>
    create: RpcTopo<Create>
    exists: RpcTopo<Exists>
  }
>
export const moodlenetKeyValueStoreExtImplId: ExtId<MoodlenetKeyValueStoreExtImpl> =
  'moodlenet.key-value-store-impl@0.0.1'

export type Get = <T>(storeName: string, key: string) => Promise<T | undefined>
export type Put = <T>(storeName: string, key: string, val: T) => Promise<{ old: T | undefined }>
export type Create = (storeName: string) => Promise<void>
export type Exists = (storeName: string) => Promise<boolean>
