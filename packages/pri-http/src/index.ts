import { v1 } from '@moodlenet/kernel/lib'
import type { ExtensionDef, PortShell, RpcTopo } from '@moodlenet/kernel/lib/v1'
import { replyAll } from '@moodlenet/kernel/lib/v1'
import { json } from 'body-parser'
import express from 'express'

export type MNPriHttpExt = ExtensionDef<
  '@moodlenet/pri-http',
  '0.0.1',
  {
    setWebAppRootFolder: RpcTopo<(_: { folder: string }) => Promise<void>>
  }
>
export const priHttpExtId: v1.ExtId<MNPriHttpExt> = '@moodlenet/pri-http@0.0.1'

const extImpl: v1.ExtImplExports = {
  module,
  extensions: {
    [priHttpExtId]: {
      async start({ shell, env }) {
        const port = env.port
        const rootPath = env.rootPath
        const extPortsApp = makeExtPortsApp(shell)

        const app = express().use(`${rootPath}/`, (_, __, next) => next())
        app.use(`/_srv`, extPortsApp)
        const server = app.listen(port, () => console.log(`http listening :${port}/${rootPath} !! :)`))
        replyAll<MNPriHttpExt>(shell, '@moodlenet/pri-http@0.0.1', {
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
  },
}

export default extImpl

function makeExtPortsApp(shell: PortShell) {
  const srvApp = express()
  srvApp.use(json())
  srvApp.post('*', async (req, res, next) => {
    /*
    gets ext name&ver 
    checks ext enabled and version match (kernel port)
    checks port is guarded
    pushes msg
    */
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
    const ext = shell.registry.getRegisteredExtension(extName)
    if (!ext?.deployment) {
      return next()
    }
    console.log('*********body', req.body)
    try {
      const response = await (v1.call(shell)(`${extName}::${path.join('.')}` as never) as any)(req.body)
      //(shell ,`${extName}::${path.join('.')}`)(req.body)
      res.json(response)
    } catch (err) {
      res.status(500).send(err)
    }
  })
  srvApp.all(`*`, (_, res) => res.status(404).send('service not available'))
  return srvApp
}
