import { caller, ExtensionDef, PortShell, RpcTopo } from '@moodlenet/kernel/lib/v1'
import type { Readable } from 'stream'

export type GenericError = {
  message: string
}
export type PutError = GenericError

export type MetaMimeType = string

export type Meta = {
  mimeType: MetaMimeType
}

export type WriteOptions = {
  expiresSecs: number
}
export type WriteRpc = (
  path: string,
  data: Buffer | Readable,
  meta: Pick<Meta, 'mimeType'>,
  opts?: Partial<WriteOptions>,
) => Promise<{ done: true; meta: Meta } | { done: false; err: PutError }>

export type MetaRpc = (path: string) => Promise<Meta | undefined>

export type ReadRpc = (path: string) => Promise<Readable | null>

export type MoodlenetBlobStorePorts = {
  meta: RpcTopo<MetaRpc>
  read: RpcTopo<ReadRpc>
  write: RpcTopo<WriteRpc>
}

export type MoodlenetBlobStoreExt = ExtensionDef<'moodlenet.blob-store', '1.0.0', MoodlenetBlobStorePorts>

export const blobStore = <StorePath extends string>(shell: PortShell) => {
  const read = (path: StorePath) => caller<MoodlenetBlobStoreExt>(shell)('moodlenet.blob-store::read')(path)
  const meta = (path: StorePath) => caller<MoodlenetBlobStoreExt>(shell)('moodlenet.blob-store::meta')(path)
  const write = (path: string, data: Buffer | Readable, meta: Pick<Meta, 'mimeType'>, opts?: Partial<WriteOptions>) =>
    caller<MoodlenetBlobStoreExt>(shell)('moodlenet.blob-store::write')(path, data, meta, opts)

  return {
    read,
    meta,
    write,
  }
}
