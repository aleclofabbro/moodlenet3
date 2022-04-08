import { v1 } from '@moodlenet/kernel/lib'
import { ExtensionDef, RpcTopo } from '@moodlenet/kernel/lib/v1'

export type MoodlenetCoreExt = ExtensionDef<
  '@moodlenet/core',
  '1.0.0',
  {
    _test: RpcTopo<<T>(_: T) => Promise<{ a: T }>>
  }
>
export const testExtId: v1.ExtId<MoodlenetCoreExt> = '@moodlenet/core@1.0.0'

const extImpl: v1.ExtImplExports = {
  module,
  extensions: {
    [testExtId]: {
      async start({ shell }) {
        console.log('I am core extension')
        // v1.watchExt<WebappExt>(shell, '@moodlenet/webapp', webapp => {
        //   if (!webapp?.active) {
        //     return
        //   }
        // v1.asyncRequest<WebappExt>({ extName: '@moodlenet/webapp', shell })({ path: 'ensureExtension' })({
        //   extId: testExtId,
        //   moduleLoc: resolve(__dirname, '..'),
        //   cmpPath: 'pkg/webapp',
        // })
        // })
        v1.replyAll<MoodlenetCoreExt>(shell, '@moodlenet/core@1.0.0', {
          _test: _shell => async _ => ({ a: _ }),
        })

        return async () => {}
      },
    },
  },
}

export default extImpl
