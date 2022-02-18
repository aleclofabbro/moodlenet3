import { MNModule } from './MNModule'

export abstract class MNComponent {
  constructor() {}
  protected assertAdopted() {
    if (!this.ref) {
      throw new Error(`Component not adopted`)
    }
  }
  public ref: { mod: MNModule; name: string } = null as any
  public adopt(mod: MNModule, name: string) {
    this.ref = { mod, name }
  }
}
