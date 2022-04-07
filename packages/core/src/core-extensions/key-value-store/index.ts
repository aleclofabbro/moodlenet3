import { call, ExtensionDef, PortShell, RpcTopo } from '@moodlenet/kernel/lib/v1'

export type Get = <T>(key: string) => Promise<T | undefined>
export type Put = <T>(key: string, val: T) => Promise<{ old: T | undefined }>
export type MoodlenetKeyValueStorePorts = {
  get: RpcTopo<Get>
  put: RpcTopo<Put>
}

export type MoodlenetKeyValueStoreExt = ExtensionDef<'moodlenet.key-value-store', '1.0.0', MoodlenetKeyValueStorePorts>

// type KvsOpts={}
// export const kvs = <T>(shell: PortShell, opts?:Partial<KvsOpts>) => {
export const kvStore = <T>(shell: PortShell) => {
  const get = <K extends string & keyof T>(key: K) =>
    call<MoodlenetKeyValueStoreExt>(shell)('moodlenet.key-value-store::get')<T[K]>(key)
  const put = <K extends string & keyof T>(key: K, val: T[K]) => {
    call<MoodlenetKeyValueStoreExt>(shell)('moodlenet.key-value-store::put')<T[K]>(key, val)
  }

  return {
    get,
    put,
  }
}
