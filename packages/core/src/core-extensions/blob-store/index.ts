import type { Ext, ExtDef, FunTopo, PortShell } from '@moodlenet/kernel'
import type { Readable } from 'stream'
import { Meta, MoodlenetBlobStoreExtImpl, PutError, WriteOptions } from './impl'

export type MoodlenetBlobStoreExtDef = Def
type Def = ExtDef<'moodlenet.blob-store', '0.0.1', { lib: FunTopo<() => Lib> }>

export type MoodlenetBlobStoreLib = Lib
type Lib = {
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

const extImpl: Ext<Def, [MoodlenetBlobStoreExtImpl]> = {
  id: 'moodlenet.blob-store@0.0.1',
  name: '',
  requires: ['moodlenet.blob-store-impl@0.0.1'],
  description: '',
  start({ K, mainShell }) {
    // TODO FIXME: requires('moodlenet.blob-store-impl@0.0.1')
    K.retrnAll<Def>(mainShell, 'moodlenet.blob-store@0.0.1', {
      lib,
    })

    return

    function lib(shell: PortShell) {
      const { extName: storeName } = K.splitPointer(shell.cwPointer)

      // TODO: should use mainShell for calls?
      const bsImplCall = K.caller<MoodlenetBlobStoreExtImpl>(shell, 'moodlenet.blob-store-impl@0.0.1')

      const exists: Lib['exists'] = () => bsImplCall('exists')(storeName)

      const create: Lib['create'] = () => bsImplCall('create')(storeName)

      const read: Lib['read'] = (blobPath: string) => bsImplCall('read')(storeName, blobPath)

      const meta: Lib['meta'] = (blobPath: string) => bsImplCall('meta')(storeName, blobPath)

      const write: Lib['write'] = (
        blobPath: string,
        data: Buffer | Readable,
        meta: Pick<Meta, 'mimeType'>,
        opts?: Partial<WriteOptions>,
      ) => bsImplCall('write')(storeName, blobPath, data, meta, opts)

      return (): Lib => ({
        read,
        meta,
        write,
        exists,
        create,
      })
    }
  },
}
export default [extImpl]
