import { ExtDef, Shell, splitExtId, subPVal, SubTopo } from '@moodlenet/kernel'

type Impl = MoodlenetKeyValueStoreExtImpl
export type MoodlenetKeyValueStoreExtImpl = ExtDef<
  'moodlenet.key-value-store-impl',
  '0.0.1',
  {
    get: SubTopo<{ storeName: string; key: string }, any>
    put: SubTopo<{ storeName: string; key: string; val: any }, { old: any | undefined }>
    create: SubTopo<{ storeName: string }, void>
    exists: SubTopo<{ storeName: string }, boolean>
  }
>

export type MoodlenetKeyValueStoreLib<KVMap> = Lib<KVMap>
type Lib<KVMap = {}> = {
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

export function KVlib<KVMap>(shell: Shell): Lib<KVMap> {
  const { extName: storeName } = splitExtId(shell.extId)

  const kvsImplSubPVal = subPVal<Impl>(shell)

  const get: Lib['get'] = key => kvsImplSubPVal('moodlenet.key-value-store-impl@0.0.1::get')({ storeName, key })

  const put: Lib['put'] = (key, val) =>
    kvsImplSubPVal('moodlenet.key-value-store-impl@0.0.1::put')({ storeName, key, val })

  const create: Lib['create'] = () => kvsImplSubPVal('moodlenet.key-value-store-impl@0.0.1::create')({ storeName })

  const exists: Lib['exists'] = () => kvsImplSubPVal('moodlenet.key-value-store-impl@0.0.1::exists')({ storeName })

  const lib: Lib<KVMap> = {
    get,
    put,
    create,
    exists,
  }
  return lib
}
