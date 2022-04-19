import { ExtDef, SubTopo } from '@moodlenet/kernel'
import { Readable } from 'stream'

export type MoodlenetBlobStoreExtImpl = ExtDef<
  'moodlenet.blob-store-impl',
  '0.0.1',
  {
    meta: MetaSub
    read: ReadSub
    write: WriteSub
    create: CreateSub
    exists: ExistsSub
  }
>
export type GenericError = {
  message: string
}
export type PutError = GenericError

export type MetaMimeType = string

export type CreateSub = SubTopo<{ storeName: string }, void>
export type ExistsSub = SubTopo<{ storeName: string }, boolean>

export type Meta = {
  mimeType: MetaMimeType
}

export type WriteOptions = {
  expiresSecs: number
}
export type WriteSub = SubTopo<
  {
    storeName: string
    path: string
    data: Buffer | Readable
    meta: Pick<Meta, 'mimeType'>
    opts?: Partial<WriteOptions>
  },
  { done: true; meta: Meta } | { done: false; err: PutError }
>

export type MetaSub = SubTopo<{ storeName: string; path: string }, Meta | undefined>

export type ReadSub = SubTopo<{ storeName: string; path: string }, Readable | null>
