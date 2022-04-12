import type { Ext, ExtDef, RpcTopo } from '@moodlenet/kernel'

export type MoodlenetCoreExt = ExtDef<
  '@moodlenet/core',
  '0.0.1',
  {
    _test: RpcTopo<<T>(_: T) => Promise<{ a: T }>>
  }
>

const extImpl: Ext<MoodlenetCoreExt> = {
  id: '@moodlenet/core@0.0.1',
  name: '',
  requires: [],
  description: '',
  start({ mainShell, K }) {
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
    K.replyAll<MoodlenetCoreExt>(mainShell, '@moodlenet/core@0.0.1', {
      _test: _test_shell => async _ => ({ a: _ }),
    })

    return
  },
}

export default [extImpl]
