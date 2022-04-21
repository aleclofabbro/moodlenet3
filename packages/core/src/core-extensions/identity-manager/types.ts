import type { ExtDef, SubTopo } from '@moodlenet/kernel'

export type Session = { a: 1 }

export type MoodlenetIdentityManagerPorts = {
  ____: SubTopo<void, 0>
}

export type MoodlenetIdentityManagerExt = ExtDef<'moodlenet.identity-manager', '0.0.1', MoodlenetIdentityManagerPorts>

declare module '@moodlenet/kernel' {
  interface Shell {
    session: Session
  }
}
