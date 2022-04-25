import { SubTopo } from '../k'
import type { ExtDef } from './ext'
import type { Port } from './topo'

export type KernelExt = ExtDef<
  'kernel.core',
  '0.1.10',
  {
    ext: {
      deployment: {
        starting: Port<'out', 1>
        ready: Port<'in', 2>
        stopping: Port<'out', { reason: StopReason }>
        done: Port<'in', 3>
        crash: Port<'in', 4>
      }
    }
    testSub: SubTopo<{ XX: string }, { a: string }>
  }
>

export type StopReason =
  | 'DISABLING_REQUIRED_EXTENSION'
  | 'USER_REQUEST'
  | 'SHUTDOWN'
  | 'UNKNOWN'
  | 'UNKNOWN'
  | 'UNKNOWN'
  | 'UNKNOWN'
