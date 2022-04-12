import type { ExtDef, FunTopo } from '@moodlenet/kernel'

export type Session = { a: 1 }

export type MoodlenetIdentityManagerPorts = {
  ____: FunTopo<() => 0>
}

export type MoodlenetIdentityManagerExt = ExtDef<'moodlenet.identity-manager', '0.0.1', MoodlenetIdentityManagerPorts>

declare module '@moodlenet/kernel' {
  interface PortShell {
    session: Session
  }
}
