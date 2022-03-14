import { v1 } from '@moodlenet/kernel/lib'
import { PortShell } from '@moodlenet/kernel/lib/v1'
import { json } from 'body-parser'
import express, { Express } from 'express'
import type { Server } from 'http'

let app: Express | undefined
let server: Server | undefined
export type MNPriHttpExt = typeof ext
const ext = v1.Extension(module, {
  name: '@moodlenet/pri-http' as const,
  version: '1.0.0' as const,
  ports: {
    activate: v1.ExtPort({}, async shell => {
      const port = shell.env.port
      const rootPath = shell.env.rootPath
      const extPortsApp = makeExtPortsApp(shell)

      app = express().use(`${rootPath}/`, (_, __, next) => next())
      app.use(`/_srv`, extPortsApp)
      server = app.listen(port, () => console.log(`http listening :${port}/${rootPath} !! :)`))
    }),
    setWebAppRootFolder: v1.ExtPort(
      {},
      ({
        message: {
          payload: { folder },
        },
      }: PortShell<{ folder: string }>) => {
        app?.get(`/*`, express.static(folder))
      },
    ),
    deactivate() {
      server?.close()
    },
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

function makeExtPortsApp(shell: PortShell) {
  //BEGIN EXT PORTS APP
  const srvApp = express()
  srvApp.use(json())
  srvApp.post('*', async (req, res, next) => {
    const path = req.path.split('/').slice(1)
    console.log('makeExtPortsApp', path, req.path)
    if (path.length < 2) {
      return next()
    }
    const extName = (
      path[0]?.startsWith('_') && path[0]?.endsWith('_')
        ? path.splice(0, 2).map((_, i) => (i === 0 ? `@${_.substring(1, _.length - 1)}` : _))
        : path.splice(0, 1)
    ).join('/')
    console.log(extName)

    //TODO: implement shell.lookupPort(addr:PortAddress):ShellGatesTopology<any>
    const ext = shell.lookup(extName)
    console.log({ ext })
    if (!ext) {
      return next()
    }
    const rrGates = path.reduce((node, prop) => node?.[prop], ext.gates as any)
    //TODO: ^^^

    if (!v1.isAsyncShellGatesTopo(rrGates)) {
      return next()
    }
    console.log('*********body', req.body)
    const response = await v1.invoke(shell, rrGates)(req.body)
    res.json(response)
  })
  srvApp.all(`*`, (_, res) => res.status(404).send('service not available'))
  //END EXT PORTS APP
  return srvApp
}
