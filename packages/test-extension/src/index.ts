import { ExtensionDef, RpcTopo } from '@moodlenet/kernel/lib'

export type TestExt = ExtensionDef<
  '@moodlenet/test-extension',
  '0.0.1',
  {
    _test: RpcTopo<<T>(_: T) => Promise<{ a: T }>>
  }
>
export const testExtId: ExtIdStrOf<TestExt> = '@moodlenet/test-extension@0.0.1'

const extImpl: ExtImplExports = {
  module,
  extensions: {
    [testExtId]: {
      async start({ shell }) {
        console.log('I am test extension')
        // watchExt<WebappExt>(shell, '@moodlenet/webapp', webapp => {
        //   if (!webapp?.active) {
        //     return
        //   }
        // asyncRequest<WebappExt>({ extName: '@moodlenet/webapp', shell })({ path: 'ensureExtension' })({
        //   extId: testExtId,
        //   moduleLoc: resolve(__dirname, '..'),
        //   cmpPath: 'pkg/webapp',
        // })
        // })
        rpcReplyAll<TestExt>(shell, '@moodlenet/test-extension', {
          _test: _shell => async _ => ({ a: _ }),
        })

        return async () => {}
      },
    },
  },
}

export default extImpl
