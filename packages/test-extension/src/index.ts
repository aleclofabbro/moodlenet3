import { v1 } from '@moodlenet/kernel/lib'
import { ExtensionDef, RpcTopo } from '@moodlenet/kernel/lib/v1'

export type TestExt = ExtensionDef<
  '@moodlenet/test-extension',
  '0.0.1',
  {
    _test: RpcTopo<<T>(_: T) => Promise<{ a: T }>>
  }
>
export const testExtId: v1.ExtIdStrOf<TestExt> = '@moodlenet/test-extension@0.0.1'

const extImpl: v1.ExtImplExports = {
  module,
  extensions: {
    [testExtId]: {
      async start({ shell }) {
        console.log('I am test extension')
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
        v1.rpcReplyAll<TestExt>(shell, '@moodlenet/test-extension', {
          _test: _shell => async _ => ({ a: _ }),
        })

        return async () => {}
      },
    },
  },
}

export default extImpl
