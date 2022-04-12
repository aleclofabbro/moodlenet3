import type { ExtensionDef, KernelLib, PortShell, RpcTopo } from '@moodlenet/kernel'
import type { Readable } from 'stream'

export type GenericError = {
  message: string
}
export type PutError = GenericError

export type MetaMimeType = string

export type Create = (storeName: string) => Promise<void>
export type Exists = (storeName: string) => Promise<boolean>

export type Meta = {
  mimeType: MetaMimeType
}

export type WriteOptions = {
  expiresSecs: number
}
export type WriteRpc = (
  storeName: string,
  path: string,
  data: Buffer | Readable,
  meta: Pick<Meta, 'mimeType'>,
  opts?: Partial<WriteOptions>,
) => Promise<{ done: true; meta: Meta } | { done: false; err: PutError }>

export type MetaRpc = (storeName: string, path: string) => Promise<Meta | undefined>

export type ReadRpc = (storeName: string, path: string) => Promise<Readable | null>

export type MoodlenetBlobStorePorts = {
  meta: RpcTopo<MetaRpc>
  read: RpcTopo<ReadRpc>
  write: RpcTopo<WriteRpc>
  create: RpcTopo<Create>
  exists: RpcTopo<Exists>
}

export type MoodlenetBlobStoreExt = ExtensionDef<'moodlenet.blob-store', '0.0.1', MoodlenetBlobStorePorts>

export type MoodlenetBlobStoreLib = {
  read(blobPath: string): Promise<Readable | null>
  meta(blobPath: string): Promise<Meta | undefined>
  write(
    blobPath: string,
    data: Buffer | Readable,
    meta: Pick<Meta, 'mimeType'>,
    opts?: Partial<WriteOptions> | undefined,
  ): Promise<{ done: true; meta: Meta } | { done: false; err: PutError }>
  create(): Promise<void>
  exists(): Promise<boolean>
}

export const moodlenetBlobStoreLib = (shell: PortShell, lib: KernelLib): MoodlenetBlobStoreLib => {
  const { extName: storeName } = lib.splitPointer(shell.cwPointer)

  const exists = () => lib.call<MoodlenetBlobStoreExt>(shell)('moodlenet.blob-store@0.0.1::exists')(storeName)

  const create = () => lib.call<MoodlenetBlobStoreExt>(shell)('moodlenet.blob-store@0.0.1::create')(storeName)

  const read = (blobPath: string) =>
    lib.call<MoodlenetBlobStoreExt>(shell)('moodlenet.blob-store@0.0.1::read')(storeName, blobPath)

  const meta = (blobPath: string) =>
    lib.call<MoodlenetBlobStoreExt>(shell)('moodlenet.blob-store@0.0.1::meta')(storeName, blobPath)

  const write = (
    blobPath: string,
    data: Buffer | Readable,
    meta: Pick<Meta, 'mimeType'>,
    opts?: Partial<WriteOptions>,
  ) =>
    lib.call<MoodlenetBlobStoreExt>(shell)('moodlenet.blob-store@0.0.1::write')(storeName, blobPath, data, meta, opts)

  return {
    read,
    meta,
    write,
    exists,
    create,
  }
}
