import { K } from '@moodlenet/core'
import { json } from 'body-parser'
import express, { Application } from 'express'
import { Server } from 'http'

export type MW = Application
export type RegMW = { mw: MW; absMountPath?: string }
export type MNPriHttpExt = K.ExtDef<
  'moodlenet.pri-http',
  '0.1.10',
  {
    use: K.Port<'in', RegMW>
  }
>
export const priHttpExtId: K.ExtId<MNPriHttpExt> = 'moodlenet.pri-http@0.1.10'

// const ext: K.Ext<MNPriHttpExt, [K.KernelExt, coreExt.sysLog.MoodlenetSysLogExt]> = {
const ext: K.Ext<MNPriHttpExt, [K.KernelExt]> = {
  id: 'moodlenet.pri-http@0.1.10',
  displayName: 'pri htth',
  requires: ['kernel.core@0.1.10'], //, 'moodlenet.sys-log@0.1.10'],
  start(shell) {
    const logger = { info: console.log }
    // const logger = coreExt.sysLog.moodlenetSysLogLib(shell)
    const env = getEnv(shell.env)
    const app = express().use(`/`, (_, __, next) => next())

    let server: Server | undefined

    app.use(`/_`, makeExtPortsApp())
    app.use(`*`, (_req, res) => res.send('ciao'))

    shell.msg$.subscribe(msg => {
      K.onMessage<MNPriHttpExt>(msg)('moodlenet.pri-http@0.1.10::use', msg => {
        const { mw, absMountPath } = msg.data
        const { extName /* , version */ } = K.splitExtId(msg.source)
        const mountPath = absMountPath ?? extName

        app.use(mountPath, mw)
      })
    })
    // K.pubAll<MNPriHttpExt>('moodlenet.pri-http@0.1.10', shell, {
    //   setWebAppRootFolder: _shell => async p => {
    //     console.log({ p })
    //     const staticApp = express.static(p.folder)
    //     app.get(`/*`, staticApp)
    //     app.get(`/*`, (req, res, next) => staticApp(((req.url = '/'), req), res, next))
    //   },
    // })

    if (env.port) {
      restartServer(env.port)
    } else {
      logger.info(`No port defined in env, won't start HTTP server at startup`)
    }

    async function stopServer() {
      return new Promise<void>((resolve, reject) => {
        if (!server) {
          return resolve()
        }
        logger.info(`Stopping HTTP server`)
        server.close(err => (err ? reject(err) : resolve()))
      })
    }
    async function restartServer(port: number) {
      await stopServer()
      return new Promise<void>((resolve, reject) => {
        logger.info(`Starting HTTP server on port ${port}`)
        server = app.listen(port, function () {
          arguments[0] ? reject(arguments[0]) : resolve()
        })
        logger.info(`HTTP listening on port ${port} :)`)
      })
    }
    function makeExtPortsApp() {
      const srvApp = express()
      srvApp.use(json())
      srvApp.post('*', async (req, res, next) => {
        /*
            gets ext name&ver 
            checks ext enabled and version match (kernel port)
            checks port is guarded
            pushes msg
            */

        const tokens = req.path.split('/').slice(1)
        const extId = tokens.slice(0, 2).join('@') as K.ExtId
        const path = tokens.slice(2).join('/') as K.TopoPath
        console.log('Exposed Api call', req.path, extId, path, req.path)
        if (!(extId && path)) {
          return next()
        }
        const pointer = K.joinPointer(extId, path)
        const exIdAvailable = shell.isExtAvailable(extId)
        console.log('Exposed Api pointer', { pointer, exIdAvailable })

        if (!(pointer && exIdAvailable)) {
          return next()
        }
        res.setHeader('Content-Type', 'application/stream+json')
        console.log('*********body', req.body)
        try {
          const apiSub = (
            K.sub(shell)(pointer as never)(req.body, {
              primary: true,
            }) as K.ValMsgObsOf<any>
          )
            // .pipe(take(4))
            .subscribe({
              //K.ValItemOf<K.SubTopo<any, any>>
              next({ msg, val }) {
                console.log('HTTP', { parMsgId: msg.parentMsgId, val })
                res.cork()
                // :/ no good !
                res.write(JSON.stringify({ msg, val }) + '\n')
                process.nextTick(() => res.uncork())
              },
              error(err) {
                console.log('HTTP', { err })
                res.status(500)
                res.end(JSON.stringify({ msg: {}, val: String(err) }))
              },
              complete() {
                console.log('HTTP complete')
                res.status(200).end()
              },
            })
          res.on('close', () => {
            // curl works , postman nope
            console.log('HTTP RESPONSE CLOSED **********************************************')
            apiSub.unsubscribe()
          })
        } catch (err) {
          console.error(err)
          res.status(500).send(String(err))
        }
      })
      srvApp.all(`*`, (_, res) => res.status(404).send('service not available'))
      return srvApp
    }
  },
}

export default [ext]

type Env = {
  port: number
}
function getEnv(rawExtEnv: K.RawExtEnv): Env {
  console.log({ rawExtEnv })
  return rawExtEnv as any //implement checks
}
