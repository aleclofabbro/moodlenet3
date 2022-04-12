import { ExtDef, RpcTopo } from '@moodlenet/kernel'
import { Readable } from 'stream'

export type MoodlenetBlobStoreExtImpl = ExtDef<
  'moodlenet.blob-store-impl',
  '0.0.1',
  {
    meta: RpcTopo<MetaRpc>
    read: RpcTopo<ReadRpc>
    write: RpcTopo<WriteRpc>
    create: RpcTopo<CreateRpc>
    exists: RpcTopo<ExistsRpc>
  }
>
export type GenericError = {
  message: string
}
export type PutError = GenericError

export type MetaMimeType = string

export type CreateRpc = (storeName: string) => Promise<void>
export type ExistsRpc = (storeName: string) => Promise<boolean>

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
