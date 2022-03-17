import { v1 } from '@moodlenet/kernel/lib'
import { AsyncPort, asyncRespond, PortShell } from '@moodlenet/kernel/lib/v1'
import { Message } from '@moodlenet/kernel/lib/v1/message'
import { json } from 'body-parser'
import express, { Express } from 'express'
import type { Server } from 'http'

let app: Express | undefined
let server: Server | undefined
export type MNPriHttpExt = {
  name: '@moodlenet/pri-http'
  version: '1.0.0'
  ports: {
    setWebAppRootFolder: AsyncPort<(_: { folder: string }) => Promise<void>>
    a: {
      b: AsyncPort<
        <T, K>(a: {
          t: T
          k: K
        }) => Promise<{
          _: Message
          tt: { ___: T }
          kk: { ___: K }
        }>
      >
    }
  }
}
/* setWebAppRootFolder: v1.ExtPort(
  {},
  ({
    message: {
      payload: { folder },
    },
  }: PortShell<{ folder: string }>) => {
    const staticApp = express.static(folder)
    app?.get(`/*`, staticApp)
    app?.get(`/*`, (req, res, next) => staticApp(((req.url = '/'), req), res, next))
  },
),
 */
v1.Extension<MNPriHttpExt>(
  module,
  {
    name: '@moodlenet/pri-http',
    version: '1.0.0',
  },
  {
    async start({ shell }) {
      const port = shell.env.port
      const rootPath = shell.env.rootPath
      const extPortsApp = makeExtPortsApp(shell)

      app = express().use(`${rootPath}/`, (_, __, next) => next())
      app.use(`/_srv`, extPortsApp)
      server = app.listen(port, () => console.log(`http listening :${port}/${rootPath} !! :)`))
      asyncRespond<MNPriHttpExt>({ extName: '@moodlenet/pri-http', shell })({
        path: 'setWebAppRootFolder',
        afnPort: _shell => async p => {
          console.log({ p })
          const staticApp = express.static(p.folder)
          app?.get(`/*`, staticApp)
          app?.get(`/*`, (req, res, next) => staticApp(((req.url = '/'), req), res, next))
        },
      })

      // asyncRespond<MNPriHttpExt>({ extName: '@moodlenet/pri-http', shell })({
      //   path: 'a.b',
      //   afnPort: _shell => async a => {
      //     return {
      //       _: shell.message,
      //       tt: { ___: a.t },
      //       kk: { ___: a.k },
      //     }
      //   },
      // })
      return async () => {
        server?.close()
      }
    },
  },
)
// setWebAppRootFolder: v1.ExtPort(
//   {},
//   ({
//     message: {
//       payload: { folder },
//     },
//   }: PortShell<{ folder: string }>) => {
//     const staticApp = express.static(folder)
//     app?.get(`/*`, staticApp)
//     app?.get(`/*`, (req, res, next) => staticApp(((req.url = '/'), req), res, next))
//   },
// )
//     deactivate() {
//       server?.close()
//     },
//     a: {
//       b: v1.asyncPort(shell => async <T, K>(a: { t: T; k: K }) => ({
//         XX: shell.message.payload.asyncPortReqArg === a,
//         _: shell.message,
//         tt: { ___: a.t },
//         kk: { ___: a.k },
//       })),
//     },
//   },
// })

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
    if (!ext?.active) {
      return next()
    }
    console.log('*********body', req.body)
    try {
      const response = await (v1.asyncRequest({ extName, shell }) as any)({ path: path.join('.') })(req.body)
      res.json(response)
    } catch (err) {
      res.status(500).send(err)
    }
  })
  srvApp.all(`*`, (_, res) => res.status(404).send('service not available'))
  //END EXT PORTS APP
  return srvApp
}
