import { MNComponent } from './MNComponent'

type Stop = void | undefined | null | (() => unknown)
interface MNServiceDef {
  start(): Stop | Promise<Stop>
}

export class MNService extends MNComponent {
  constructor(public def: MNServiceDef) {
    super()
  }
}
