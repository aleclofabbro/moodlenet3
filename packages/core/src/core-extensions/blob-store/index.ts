import { Shell, splitExtId, sub } from '@moodlenet/kernel'
import { firstValueFrom } from 'rxjs'
import type { Readable } from 'stream'
import { Meta, MoodlenetBlobStoreExtImpl, PutError, WriteOptions } from './impl'

export type MoodlenetBlobStoreLib = Lib
type Lib = {
  read(path: string): Promise<Readable | null>
  meta(path: string): Promise<Meta | undefined>
  write(
    path: string,
    data: Buffer | Readable,
    meta: Pick<Meta, 'mimeType'>,
    opts?: Partial<WriteOptions> | undefined,
  ): Promise<{ done: true; meta: Meta } | { done: false; err: PutError }>
  create(): Promise<void>
  exists(): Promise<boolean>
}

export function blobStoreLib(shell: Shell) {
  const { extName: storeName } = splitExtId(shell.extId)

  const bsImplCall = sub<MoodlenetBlobStoreExtImpl>(shell)

  const exists: Lib['exists'] = () =>
    firstValueFrom(bsImplCall('moodlenet.blob-store-impl@0.0.1::exists')({ storeName }))

  const create: Lib['create'] = () =>
    firstValueFrom(bsImplCall('moodlenet.blob-store-impl@0.0.1::create')({ storeName }))

  const read: Lib['read'] = (path: string) =>
    firstValueFrom(bsImplCall('moodlenet.blob-store-impl@0.0.1::read')({ storeName, path }))

  const meta: Lib['meta'] = (path: string) =>
    firstValueFrom(bsImplCall('moodlenet.blob-store-impl@0.0.1::meta')({ storeName, path }))

  const write: Lib['write'] = (
    path: string,
    data: Buffer | Readable,
    meta: Pick<Meta, 'mimeType'>,
    opts?: Partial<WriteOptions>,
  ) => firstValueFrom(bsImplCall('moodlenet.blob-store-impl@0.0.1::write')({ storeName, path, data, meta, opts }))

  return (): Lib => ({
    read,
    meta,
    write,
    exists,
    create,
  })
}
