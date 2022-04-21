import { Ext, ExtDef, onMessage, pub, pubAll, SubTopo } from '@moodlenet/kernel'

export type MoodlenetCoreExt = ExtDef<
  '@moodlenet/core',
  '0.0.1',
  {
    _test: SubTopo<{ a: string }, { a: number }>
  }
>

const extImpl: Ext<MoodlenetCoreExt> = {
  id: '@moodlenet/core@0.0.1',
  displayName: '',
  requires: [],
  description: '',
  start(shell) {
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

    shell.msg$.subscribe(msg => {
      const onMy = onMessage<MoodlenetCoreExt>(msg)
      onMy('@moodlenet/core@0.0.1::', msg => {
        msg.pointer
      })
      pub<MoodlenetCoreExt>(shell)('@moodlenet/core@0.0.1::_test')(async ({ msg, req }) => {
        msg.pointer
        req.a
        return { a: 2 }
      })
      pubAll<MoodlenetCoreExt>('@moodlenet/core@0.0.1', shell, {
        _test({ msg, req }) {
          req.a.at
          msg.bound
          return [{ a: 1 }]
        },
      })
    })

    return
  },
}

export default [extImpl]
