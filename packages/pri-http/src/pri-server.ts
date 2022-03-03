import express from 'express'
import { Server } from 'http'
export const start = ({
  port,
  rootPath = '/',
}: {
  port: number
  rootPath?: string
}) => {
  const app = express()
  app.use(`${rootPath}`, (_, __, next) => {
    next()
  })
  app.use(`${rootPath}`, (_, res) => {
    res.status(404).send('not found')
  })

  return new Promise<Server>((resolve) => {
    const server = app.listen(port, () => {
      console.log(`http listening @${port}`)
      resolve(server)
    })
  })
}
