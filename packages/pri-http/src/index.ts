import { v1 } from '@moodlenet/kernel/lib'
import { shellGatesTopologyOf } from '@moodlenet/kernel/lib/v1'
import { inspect } from 'util'
import { makeApp } from './pri-server'

const ext = v1.Extension(module, {
  name: '@moodlenet/pri-http',
  version: '1.0.0',
  ports: {
    activate: v1.ExtPort({}, async (shell) => {
      const port = shell.env.port
      const webAppRootFolder = shell.env.webAppRootFolder

      const app = makeApp({ shell, webAppRootFolder })
      const server = app.listen(port, () =>
        console.log(`http listening @${port} !! :)`)
      )
      const myShellgates = shellGatesTopologyOf(
        ext.gates,
        shell.message.session,
        shell.cwAddress
      )
      const x = await v1.invoke(shell, myShellgates.a.b)({ t: 12, k: '10' })
      x.kk.___
      x.tt.___
      shell.listen((shell) => {
        console.log('listen', inspect(shell, false, 8, true))
        shell.message.ctx.xxx = 10000
        // FIXME: need a better message filter function
        if (shell.isMsg(ext.gates.deactivate, shell.message)) {
          console.log('stop server')
          server.close()
        }
      })
    }),
    deactivate() {},
    a: {
      b: v1.asyncPort((__) => async <T, K>(a: { t: T; k: K }) => ({
        XX: __.message.payload.arg === a,
        _: __.message,
        tt: { ___: a.t },
        kk: { ___: a.k },
      })),
    },
  },
})
