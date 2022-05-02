import { SubTopo } from '../k'
import type { ExtDef } from './ext'
import type { Port } from './topo'

export type KernelExt = ExtDef<
  'kernel.core',
  '0.1.10',
  {
    ext: {
      enabled: Port<'out', {}>
      disabled: Port<'out', {}>
      deployed: Port<'out', {}>
      undeployed: Port<'out', {}>
    }
    testSub: SubTopo<{ XX: string }, { a: string }>
  }
>
