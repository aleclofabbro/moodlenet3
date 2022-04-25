import { K } from '@moodlenet/core'

export type TestExt = K.ExtDef<
  '@moodlenet/test-extension',
  '0.1.10',
  {
    _test: K.SubTopo<{ a: string }, { b: number }>
  }
>

const extImpl: K.Ext<TestExt> = {
  id: '',
  start(/* shell */) {
    console.log('I am test extension')

    return () => {}
  },
}

export default extImpl
