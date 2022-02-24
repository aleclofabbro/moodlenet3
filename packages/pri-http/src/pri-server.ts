import { Primary } from '@moodlenet/kernel/lib/v1/Primary'
import express from 'express'
import env from './env'
export default () =>
  Primary({
    name: 'Primary HTP Server',
    async start(shell) {
      const { port, rootPath } = env
      const app = express()
      app.use(`${rootPath}`, (_, __, next) => {
        next()
      })
      app.use(`${rootPath}`, (_, res) => {
        res.status(404).send('not found')
      })

      return new Promise((resolve) =>
        app.listen(port, () => {
          console.log(`http listening @${port}`)
          resolve(() => console.log('stop http'))
        })
      )
    },
    async stop(shell) {},
  })
