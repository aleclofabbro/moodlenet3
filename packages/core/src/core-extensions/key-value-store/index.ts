import type { Ext, ExtDef, FunTopo, PortShell } from '@moodlenet/kernel'
import type { MoodlenetKeyValueStoreExtImpl as Impl } from './impl'

export type MoodlenetKeyValueStoreLib<KVMap> = Lib<KVMap>
export type MoodlenetKeyValueStoreDef = Def

type Def = ExtDef<'moodlenet.key-value-store', '0.0.1', { lib: FunTopo<<KVMap>() => Lib<KVMap>> }>

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

const moodlenetKeyValueStoreExt: Ext<Def, [Impl]> = {
  id: 'moodlenet.key-value-store@0.0.1',
  name: 'yyy',
  description: 'xxx',
  requires: ['moodlenet.key-value-store-impl@0.0.1'],
  start({ K, mainShell }) {
    // TODO FIXME: requires('moodlenet.key-value-store-impl@0.0.1')
    K.retrnAll<MoodlenetKeyValueStoreDef>(mainShell, 'moodlenet.key-value-store@0.0.1', {
      lib,
    })

    return

    function lib(shell: PortShell) {
      const { extName: storeName } = K.splitPointer(shell.cwPointer)

      // TODO: should use mainShell for calls?
      const kvsImplCall = K.caller<Impl>(shell, 'moodlenet.key-value-store-impl@0.0.1')

      const get: Lib['get'] = key => kvsImplCall('get')(storeName, key)

      const put: Lib['put'] = (key, val) => kvsImplCall('put')(storeName, key, val)

      const create: Lib['create'] = () => kvsImplCall('create')(storeName)

      const exists: Lib['exists'] = () => kvsImplCall('exists')(storeName)

      return <KVMap>(): Lib<KVMap> => ({
        get,
        put,
        create,
        exists,
      })
    }
  },
}

export default [moodlenetKeyValueStoreExt]
