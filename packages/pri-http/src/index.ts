import { v1 } from '@moodlenet/kernel/lib'
import type { AsyncPort, ExtensionDef, PortShell } from '@moodlenet/kernel/lib/v1'
import { replyAll } from '@moodlenet/kernel/lib/v1'
import { json } from 'body-parser'
import express from 'express'

export type MNPriHttpExt = ExtensionDef<
  '@moodlenet/pri-http',
  '1.0.0',
  {
    setWebAppRootFolder: AsyncPort<(_: { folder: string }) => Promise<void>>
  }
>
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

      const app = express().use(`${rootPath}/`, (_, __, next) => next())
      app.use(`/_srv`, extPortsApp)
      const server = app.listen(port, () => console.log(`http listening :${port}/${rootPath} !! :)`))
      replyAll<MNPriHttpExt>(shell, '@moodlenet/pri-http', {
        setWebAppRootFolder: _shell => async p => {
          console.log({ p })
          const staticApp = express.static(p.folder)
          app?.get(`/*`, staticApp)
          app?.get(`/*`, (req, res, next) => staticApp(((req.url = '/'), req), res, next))
        },
      })

      return async () => {
        server?.close()
      }
    },
  },
)
function makeExtPortsApp(shell: PortShell) {
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
      const response = await (v1.request(shell)(`${extName}::${path.join('.')}` as never) as any)(req.body)
      //(shell ,`${extName}::${path.join('.')}`)(req.body)
      res.json(response)
    } catch (err) {
      res.status(500).send(err)
    }
  })
  srvApp.all(`*`, (_, res) => res.status(404).send('service not available'))
  return srvApp
}
