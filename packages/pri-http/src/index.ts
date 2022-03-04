import { v1 } from '@moodlenet/kernel/lib'
import { ExtPort } from '@moodlenet/kernel/lib/v1/Extension'
import { makeApp } from './pri-server'

v1.Extension(module, {
  name: '@moodlenet/pri-http',
  version: '1.0.0',
  ports: {
    activate: ExtPort({}, (shell) => {
      const port = shell.env.port
      const app = makeApp({ shell })

      const server = app.listen(port, () =>
        console.log(`http listening @${port}`)
      )
      const _this = shell.lookup('@moodlenet/pri-http')!
      _this.gates.deactivate.meta.guard?.(shell)
      shell.listen(({ message }) => {
        console.log('listen', message)

        if (shell.isMsg(_this.gates.deactivate, message)) {
          console.log('stop server')
          server.close()
        }
      })
    }),
    deactivate() {},
    a: {
      b: ExtPort({ guard() {} }, (shell) => {
        console.log(shell.message)
      }),
    },
  },
})
