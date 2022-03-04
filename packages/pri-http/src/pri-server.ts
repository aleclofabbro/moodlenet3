import {
  PortShell,
  ShellGate,
  ShellGatesTopology,
} from '@moodlenet/kernel/lib/v1/Extension/types'
import { json } from 'body-parser'
import express from 'express'

export const makeApp = ({
  shell,
  rootPath = '',
}: {
  shell: PortShell
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
    const port = path.reduce(
      (node, prop) => (node as any)?.[prop],
      ext.gates as ShellGatesTopology | undefined
    )
    if (!port || 'function' !== typeof port) {
      return next()
    }

    const response = await (port as ShellGate<PortShell>)({ payload: req.body })
    res.send(response)
  })
  app.use(`${rootPath}/`, (_, res) => {
    res.status(404).send('not found')
  })

  return app
}
