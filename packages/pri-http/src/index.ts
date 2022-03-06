import { v1 } from '@moodlenet/kernel/lib'
import { inspect } from 'util'
import { makeApp } from './pri-server'

type Def = typeof def
const def = {
  name: '@moodlenet/pri-http',
  version: '1.0.0',
  ports: {
    activate: v1.ExtPort({}, async (shell) => {
      const port = shell.env.port
      const app = makeApp({ shell })

      const server = app.listen(port, () =>
        console.log(`http listening @${port}`)
      )
      const _this = shell.lookup<Def>('@moodlenet/pri-http')!

      const x = await v1.invoke(shell, _this.gates.a.b)({ t: '12', k: 10 })
      x.kk.___
      x.tt.___
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
      b: v1.asyncPort((__) => async <T, K>(a: { t: T; k: K }) => ({
        _: __.message.target,
        tt: { ___: a.t },
        kk: { ___: a.k },
      })),
    },
  },
} as const

v1.Extension(module, def)
