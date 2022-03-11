import { v1 } from '@moodlenet/kernel/lib'
import type { MNPriHttpExt } from '@moodlenet/pri-http/pkg'

v1.Extension(module, {
  name: '@moodlenet/webapp',
  version: '1.0.0',
  ports: {
    activate(shell) {
      v1.watchExt<MNPriHttpExt>(shell, '@moodlenet/pri-http', async priHttp => {
        console.log('webapp watched priHttp ', priHttp)
        if (!priHttp) {
          return
        }
        console.log('**', await v1.invoke(shell, priHttp.gates.a.b)({ k: 10, t: true }))
      })
    },
    deactivate() {},
  },
})
