import { v1 } from '@moodlenet/kernel/lib'
import { resolve } from 'path'

const extId: v1.ExtensionId = {
  name: '@moodlenet/test-extension' as const,
  version: '1.0.0' as const,
}
export type MNPriHttpExt = typeof ext
const ext = v1.Extension(module, {
  ...extId,
  ports: {
    activate: v1.ExtPort({}, async shell => {
      v1.watchExt(shell, '@moodlenet/webapp', webapp => {
        if (!webapp) {
          return
        }
        ;(webapp.gates.ensureExtension as any)?.({
          payload: {
            extId,
            moduleLoc: resolve(__dirname, '..', '..', 'test-extension'),
            cmpPath: `pkg/webapp`,
          },
        })
      })
    }),
    deactivate() {},
    myNs: {
      testApi: v1.asyncPort(shell => async <T, K>(_: { argA: T; argB: K }) => ({
        _: shell.message,
        a: _.argA,
        b: _.argB,
      })),
    },
  },
})
