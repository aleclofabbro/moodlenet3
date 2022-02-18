import { MNService } from '@moodlenet/process/lib/MNService'
import express from 'express'
import env from './env'

export const httpServer = new MNService({
  start: () => {
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
})
