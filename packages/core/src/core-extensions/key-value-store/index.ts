import type { ExtensionDef, FunTopo, KernelLib, PortShell, RpcTopo } from '@moodlenet/kernel'

export type MoodlenetKeyValueStoreExt = ExtensionDef<'moodlenet.key-value-store', '0.0.1', MoodlenetKeyValueStorePorts>

export type MoodlenetKeyValueStorePorts = {
  get: RpcTopo<Get>
  put: RpcTopo<Put>
  create: RpcTopo<Create>
  exists: RpcTopo<Exists>
  lib: FunTopo<<KVMap>() => MoodlenetKeyValueStoreLib<KVMap>>
}

export type Get = <T>(storeName: string, key: string) => Promise<T | undefined>
export type Put = <T>(storeName: string, key: string, val: T) => Promise<{ old: T | undefined }>
export type Create = (storeName: string) => Promise<void>
export type Exists = (storeName: string) => Promise<boolean>

export type MoodlenetKeyValueStoreLib<KVMap> = {
  get<K extends string & keyof KVMap>(key: K): Promise<KVMap[K] | undefined>
  put<K extends string & keyof KVMap>(
    key: K,
    val: KVMap[K],
  ): Promise<{
    old: KVMap[K] | undefined
  }>
  create(): Promise<void>
  exists(): Promise<boolean>
}

export const moodlenetKeyValueStoreLib = <KVMap>(
  shell: PortShell,
  lib: KernelLib,
): MoodlenetKeyValueStoreLib<KVMap> => {
  const { extName: storeName } = lib.splitPointer(shell.cwPointer)

  const get: MoodlenetKeyValueStoreLib<KVMap>['get'] = key =>
    lib.call<MoodlenetKeyValueStoreExt>(shell)('moodlenet.key-value-store@0.0.1::get')(storeName, key)

  const put: MoodlenetKeyValueStoreLib<KVMap>['put'] = (key, val) =>
    lib.call<MoodlenetKeyValueStoreExt>(shell)('moodlenet.key-value-store@0.0.1::put')(storeName, key, val)

  const create: MoodlenetKeyValueStoreLib<KVMap>['create'] = () =>
    lib.call<MoodlenetKeyValueStoreExt>(shell)('moodlenet.key-value-store@0.0.1::create')(storeName)

  const exists: MoodlenetKeyValueStoreLib<KVMap>['exists'] = () =>
    lib.call<MoodlenetKeyValueStoreExt>(shell)('moodlenet.key-value-store@0.0.1::exists')(storeName)

  return {
    get,
    put,
    create,
    exists,
  }
}
