import { PortShell } from '@moodlenet/kernel/lib/v1'
import {
  invoke,
  isReqResShellGatesTopo,
} from '@moodlenet/kernel/lib/v1/port-access-strategies/lib'
import { json } from 'body-parser'
import express from 'express'

export const makeApp = ({
  shell,
  rootPath = '',
}: {
  shell: PortShell<any>
  rootPath?: string
}) => {
  const app = express()
  app.use(json())
  app.use(`${rootPath}/_/`, async (req, res, next) => {
    const path = req.path.split('/').slice(1)
    console.log(path)
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
    const ext = shell.lookup(extName)
    if (!ext) {
      return next()
    }
    const rrGates = path.reduce((node, prop) => node?.[prop], ext.gates as any)
    if (!isReqResShellGatesTopo(rrGates)) {
      return next()
    }

    const response = await invoke(shell, rrGates)(req.body)
    res.send(response)
  })
  app.use(`${rootPath}/`, (_, res) => {
    res.status(404).send('not found')
  })

  return app
}
