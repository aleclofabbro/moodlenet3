import type { ExtDef } from './ext'
import type { Port } from './topo'

export type KernelExt = ExtDef<
  'kernel.core',
  '0.0.1',
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
  }
>
export type KernelExts = ExtDef<
  'kernels.core',
  '0.0.1',
  {
    ext: {
      deployment: {
        start: Port<'out', 1>
        ready: Port<'in', 2>
        stop: Port<'out', { reason: StopReason }>
        done: Port<'in', 3>
        crash: Port<'in', 4>
      }
    }
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
