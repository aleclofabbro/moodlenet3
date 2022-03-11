import { v1 } from '@moodlenet/kernel/lib'
import { shellGatesTopologyOf } from '@moodlenet/kernel/lib/v1'
import { makeApp } from './pri-server'

export type MNPriHttpExt = typeof ext
const ext = v1.Extension(module, {
  name: '@moodlenet/pri-http',
  version: '1.0.0',
  ports: {
    activate: v1.ExtPort({}, async shell => {
      const port = shell.env.port
      const webAppRootFolder = shell.env.webAppRootFolder

      const app = makeApp({ shell, webAppRootFolder })
      const server = app.listen(port, () => console.log(`http listening @${port} !! :)`))
      const myShellgates = shellGatesTopologyOf(ext.gates, shell.message.session, shell.cwAddress)
      const x = await v1.invoke(shell, myShellgates.a.b)({ t: 12, k: '10' })
      ;[x.kk.___, x.tt.___, server.connections]
    }),
    deactivate() {},
    a: {
      b: v1.asyncPort(shell => async <T, K>(a: { t: T; k: K }) => ({
        XX: shell.message.payload.asyncPortReqArg === a,
        _: shell.message,
        tt: { ___: a.t },
        kk: { ___: a.k },
      })),
    },
  },
})
