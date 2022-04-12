import type { ExtensionDef, ExtId, ExtImplExports, FunTopo, PortShell } from '@moodlenet/kernel'
import type { Readable } from 'stream'
import { Meta, MoodlenetBlobStoreExtImpl, PutError, WriteOptions } from './impl'

export type MoodlenetBlobStoreExt = ExtensionDef<
  'moodlenet.blob-store',
  '0.0.1',
  {
    lib: FunTopo<() => MoodlenetBlobStoreLib>
  }
>
export const moodlenetBlobStoreExtId: ExtId<MoodlenetBlobStoreExt> = 'moodlenet.blob-store@0.0.1'

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

const extImpl: ExtImplExports = {
  module,
  extensions: {
    [moodlenetBlobStoreExtId]: {
      async start({ K, mainShell }) {
        // TODO FIXME: requires('moodlenet.blob-store-impl@0.0.1')
        K.retrnAll<MoodlenetBlobStoreExt>(mainShell, 'moodlenet.blob-store@0.0.1', {
          lib,
        })

        return async () => {}

        function lib(shell: PortShell) {
          const { extName: storeName } = K.splitPointer(shell.cwPointer)

          // TODO: should use mainShell for calls?
          const bsImplCall = K.caller<MoodlenetBlobStoreExtImpl>(shell, 'moodlenet.blob-store-impl@0.0.1')

          const exists: MoodlenetBlobStoreLib['exists'] = () => bsImplCall('exists')(storeName)

          const create: MoodlenetBlobStoreLib['create'] = () => bsImplCall('create')(storeName)

          const read: MoodlenetBlobStoreLib['read'] = (blobPath: string) => bsImplCall('read')(storeName, blobPath)

          const meta: MoodlenetBlobStoreLib['meta'] = (blobPath: string) => bsImplCall('meta')(storeName, blobPath)

          const write: MoodlenetBlobStoreLib['write'] = (
            blobPath: string,
            data: Buffer | Readable,
            meta: Pick<Meta, 'mimeType'>,
            opts?: Partial<WriteOptions>,
          ) => bsImplCall('write')(storeName, blobPath, data, meta, opts)

          return (): MoodlenetBlobStoreLib => ({
            read,
            meta,
            write,
            exists,
            create,
          })
        }
      },
    },
  },
}
export default extImpl
