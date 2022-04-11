import type { ExtensionDef, ListenerShell, RpcTopo } from '@moodlenet/kernel'
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

export type MoodlenetBlobStoreExt = ExtensionDef<'moodlenet.blob-store', '0.0.1', MoodlenetBlobStorePorts>

export const blobStore = <BlobPath extends string>(shell: ListenerShell) => {
  const read = (blobPath: BlobPath) =>
    shell.call<MoodlenetBlobStoreExt>(shell)('moodlenet.blob-store@0.0.1::read')(blobPath)
  const meta = (blobPath: BlobPath) =>
    shell.call<MoodlenetBlobStoreExt>(shell)('moodlenet.blob-store@0.0.1::meta')(blobPath)
  const write = (
    blobPath: string,
    data: Buffer | Readable,
    meta: Pick<Meta, 'mimeType'>,
    opts?: Partial<WriteOptions>,
  ) => shell.call<MoodlenetBlobStoreExt>(shell)('moodlenet.blob-store@0.0.1::write')(blobPath, data, meta, opts)

  return {
    read,
    meta,
    write,
  }
}
