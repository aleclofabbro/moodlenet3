import { K } from '@moodlenet/core'

export type TestExt = K.ExtDef<
  '@moodlenet/test-extension',
  '0.1.10',
  {
    _test: K.SubTopo<{ a: string }, { b: number }>
  }
>

const ext: K.Ext<TestExt, [K.KernelExt]> = {
  id: '@moodlenet/test-extension@0.1.10',
  displayName: 'test ext',
  requires: ['kernel.core@0.1.10'],
  enable(/* shell */) {
    console.log('I am test extension')
    return {
      deploy() {
        return {}
      },
    }
  },
}

export default [ext]
