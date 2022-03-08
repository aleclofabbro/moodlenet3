import { PortShell } from '@moodlenet/kernel/lib/v1'
import {
  invoke,
  isAsyncShellGatesTopo,
} from '@moodlenet/kernel/lib/v1/port-access-strategies/async-port'
import { json } from 'body-parser'
import express from 'express'

export const makeApp = ({
  shell,
  webAppRootFolder,
  rootPath = '',
}: {
  shell: PortShell<any>
  webAppRootFolder: string
  libFolders: { ext: string; dir: string }[]
  rootPath?: string
}) => {
  const app = express()
  //srvApp
  const srvApp = express()
  srvApp.use(json())
  srvApp.post('*', async (req, res, next) => {
    const path = req.path.split('/').slice(1)
    console.log(path, req.path)
    if (path.length < 2) {
      return next()
    }
    const extName = (
      path[0]?.startsWith('_') && path[0]?.endsWith('_')
        ? path
            .splice(0, 2)
            .map((_, i) => (i === 0 ? `@${_.substring(1, _.length - 1)}` : _))
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

    if (!isAsyncShellGatesTopo(rrGates)) {
      return next()
    }

    const response = await invoke(shell, rrGates)(req.body)
    res.send(response)
  })
  srvApp.all(`*`, (_, res) => res.status(404).send('service not available'))
  app.use(`${rootPath}/_srv/`, srvApp)
  //srvApp

  // //allLibsApp
  // const allLibsApp = express()
  // libFolders.forEach((lib) => {
  //   //libApp
  //   const libApp = express()
  //   const libPath = `/${lib.ext}/`
  //   console.log(`hooking : [${lib.ext}] ${libPath} -> ${lib.dir}`)
  //   libApp.use('/', express.static(lib.dir))
  //   allLibsApp.use(libPath, libApp)
  //   //libApp
  // })
  // app.use(`${rootPath}/_lib/`, allLibsApp)
  // //allLibsApp

  app.get(`${rootPath}/*`, express.static(webAppRootFolder))

  return app
}
