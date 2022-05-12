import { coreExt, K } from '@moodlenet/core'
import { join } from 'path'

export type TestExt = K.ExtDef<
  'moodlenet.test-extension',
  '0.1.10',
  {
    testSub: K.SubTopo<{ XX: string }, { a: string }>
    _test: K.SubTopo<{ a: string }, { b: number }>
  }
>

const ext: K.Ext<TestExt, [K.KernelExt]> = {
  id: 'moodlenet.test-extension@0.1.10',
  displayName: 'test ext',
  requires: ['kernel.core@0.1.10'],
  enable(shell) {
    console.log('I am test extension')
    shell.onExtInstance<coreExt.webapp.WebappExt>('moodlenet.webapp@0.1.10', () => {
      shell.push('in')<coreExt.webapp.WebappExt>('moodlenet.webapp@0.1.10')('ensureExtension')({
        cmpPath: join(__dirname, 'webapp'),
      })
    })
    shell.expose({
      '_test/sub': {
        validate(/* data */) {
          return { valid: true }
        },
      },
      'testSub/sub': {
        validate(/* data */) {
          return { valid: true }
        },
      },
    })
    return {
      deploy() {
        K.pubAll<TestExt>('moodlenet.test-extension@0.1.10', shell, {
          _test: ({
            msg: {
              data: {
                req: { a },
              },
            },
          }) => [{ b: Number(a) }],
          testSub(_) {
            return K.rx.interval(500).pipe(
              K.rx.take(5),
              K.rx.map(n => ({ a: `${_.msg.data.req.XX}\n\n(${n})` })),
            )
          },
        })
        return {}
      },
    }
  },
}

export default [ext]
