import { v1 } from '@moodlenet/kernel/lib'
import { inspect } from 'util'
import { makeApp } from './pri-server'

v1.Extension(module, {
  name: '@moodlenet/pri-http',
  version: '1.0.0',
  ports: {
    activate: v1.ExtPort({}, (shell) => {
      const port = shell.env.port
      const app = makeApp({ shell })

      const server = app.listen(port, () =>
        console.log(`http listening @${port}`)
      )
      const _this = shell.lookup('@moodlenet/pri-http')!
      _this.gates.deactivate.meta.guard?.(shell)
      shell.listen((shell) => {
        console.log('listen', inspect(shell, false, 8, true))
        shell.message.ctx.xxx = 10000
        if (shell.isMsg(_this.gates.deactivate, shell.message)) {
          console.log('stop server')
          server.close()
        }
      })
    }),
    deactivate() {},
    a: {
      b: v1.ExtPort<{ a: 1 }>({ guard() {} }, (shell) => {
        console.log('http.a.b: ', inspect(shell, false, 8, true))
      }),
    },
  },
})
