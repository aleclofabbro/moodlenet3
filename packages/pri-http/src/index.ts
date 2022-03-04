import { v1 } from '@moodlenet/kernel/lib'
import { inspect } from 'util'
import { makeApp } from './pri-server'

type Def = typeof def
const def = {
  name: '@moodlenet/pri-http',
  version: '1.0.0',
  ports: {
    activate: v1.ExtPort({}, (shell) => {
      const port = shell.env.port
      const app = makeApp({ shell })

      const server = app.listen(port, () =>
        console.log(`http listening @${port}`)
      )
      const _this = shell.lookup<Def>('@moodlenet/pri-http')!

      v1.invoke(shell, _this.gates.a.b)({ a: 12 })
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
      b: v1.reqResPort(async <T>(t: T) => ({ _: `http.a.b:`, t })),
    },
  },
} as const
v1.Extension(module, def)
