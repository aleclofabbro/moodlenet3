import type { ExtensionDef, ExtId, ExtImplExports, RpcTopo } from '@moodlenet/kernel'

export type MoodlenetCoreExt = ExtensionDef<
  '@moodlenet/core',
  '0.0.1',
  {
    _test: RpcTopo<<T>(_: T) => Promise<{ a: T }>>
  }
>
export const testExtId: ExtId<MoodlenetCoreExt> = '@moodlenet/core@0.0.1'

const extImpl: ExtImplExports = {
  module,
  extensions: {
    [testExtId]: {
      async start({ shell }) {
        console.log('I am core extension')
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
        shell.replyAll<MoodlenetCoreExt>(shell, '@moodlenet/core@0.0.1', {
          _test: _shell => async _ => ({ a: _ }),
        })

        return async () => {}
      },
    },
  },
}

export default extImpl
