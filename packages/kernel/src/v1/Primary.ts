import { assertCurrentExtShell, ExtensionShell } from './Extension'
import type { AnnotatedExtComponent } from './types'

export interface PrimaryDef extends AnnotatedExtComponent {
  start(shell: ExtensionShell): Promise<unknown>
  stop(shell: ExtensionShell): Promise<unknown>
}

export interface Primary {
  def: PrimaryDef
  start(): Promise<unknown>
  stop(): Promise<unknown>
  status: PrimaryStatus
}
export function Primary(def: PrimaryDef) {
  const extShell = assertCurrentExtShell()
  const pri: Primary = {
    def,
    status: 'stop',
    start: async function start() {
      setStatus('starting')
      const startPromise = def.start(extShell)
      startPromise.then(
        () => setStatus('running'),
        () => setStatus('start-error')
      )
      return startPromise
    },
    stop: async function stop() {
      setStatus('stopping')
      const startPromise = def.start(extShell)
      startPromise.then(
        () => setStatus('stop'),
        () => setStatus('stop-error')
      )
      return startPromise
    },
  }

  function setStatus(status: PrimaryStatus) {
    pri.status = status
    console.log(
      `${extShell.pkgName()}@${extShell.pkgVersion()} pimary ${
        def.name
      } status:${status}`
    )
  }

  return pri
}

type PrimaryStatus =
  | 'stop'
  | 'starting'
  | 'start-error'
  | 'running'
  | 'stopping'
  | 'stop-error'
