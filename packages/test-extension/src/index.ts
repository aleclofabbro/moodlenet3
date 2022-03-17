import { v1 } from '@moodlenet/kernel/lib'
import type { WebappExt } from '@moodlenet/webapp/lib'
import { resolve } from 'path'

export type TestExt = {
  name: '@moodlenet/test-extension'
  version: '1.0.0'
  ports: {}
}
export const testExtId: v1.ExtIdOf<TestExt> = {
  name: '@moodlenet/test-extension',
  version: '1.0.0',
} as const
v1.Extension(
  module,
  {
    name: '@moodlenet/test-extension',
    version: '1.0.0',
  },
  {
    async start({ shell }) {
      v1.watchExt<WebappExt>(shell, '@moodlenet/webapp', webapp => {
        if (!webapp?.active) {
          return
        }
        v1.asyncRequest<WebappExt>({ extName: '@moodlenet/webapp', shell })({ path: 'ensureExtension' })({
          extId: testExtId,
          moduleLoc: resolve(__dirname, '..'),
          cmpPath: 'pkg/webapp',
        })
      })

      return async () => {}
    },
  },
)
