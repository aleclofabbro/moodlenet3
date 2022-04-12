import type { ExtensionDef, ExtId, ExtImplExports, FunTopo, PortShell } from '@moodlenet/kernel'
import type { MoodlenetKeyValueStoreExtImpl } from './impl'

export type MoodlenetKeyValueStoreExt = ExtensionDef<
  'moodlenet.key-value-store',
  '0.0.1',
  {
    lib: FunTopo<<KVMap>() => MoodlenetKeyValueStoreLib<KVMap>>
  }
>
export const moodlenetKeyValueStoreExtId: ExtId<MoodlenetKeyValueStoreExt> = 'moodlenet.key-value-store@0.0.1'

export type MoodlenetKeyValueStoreLib<KVMap = {}> = {
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

const extImpl: ExtImplExports = {
  module,
  extensions: {
    [moodlenetKeyValueStoreExtId]: {
      async start({ K, mainShell }) {
        // TODO FIXME: requires('moodlenet.key-value-store-impl@0.0.1')
        K.retrnAll<MoodlenetKeyValueStoreExt>(mainShell, 'moodlenet.key-value-store@0.0.1', {
          lib,
        })

        return async () => {}

        function lib(shell: PortShell) {
          const { extName: storeName } = K.splitPointer(shell.cwPointer)

          // TODO: should use mainShell for calls?
          const kvsImplCall = K.caller<MoodlenetKeyValueStoreExtImpl>(shell, 'moodlenet.key-value-store-impl@0.0.1')

          const get: MoodlenetKeyValueStoreLib['get'] = key => kvsImplCall('get')(storeName, key)

          const put: MoodlenetKeyValueStoreLib['put'] = (key, val) => kvsImplCall('put')(storeName, key, val)

          const create: MoodlenetKeyValueStoreLib['create'] = () => kvsImplCall('create')(storeName)

          const exists: MoodlenetKeyValueStoreLib['exists'] = () => kvsImplCall('exists')(storeName)

          return <KVMap>(): MoodlenetKeyValueStoreLib<KVMap> => ({
            get,
            put,
            create,
            exists,
          })
        }
      },
    },
  },
}

export default extImpl
