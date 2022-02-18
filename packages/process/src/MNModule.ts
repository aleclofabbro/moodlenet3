import type { MNComponent } from './MNComponent'
import { MNPackage } from './MNPackage'
import { MNService } from './MNService'

export interface MNModuleDef {
  components: Record<string, MNComponent>
}

export class MNModule {
  constructor(public def: MNModuleDef) {}
  private assertAdopted() {
    if (!this.ref) {
      throw new Error(`Module not adopted`)
    }
  }

  public ref: { pkg: MNPackage; name: string } = null as any
  public adopt(pkg: MNPackage, name: string) {
    this.ref = { pkg, name }
    Object.entries(this.def.components).forEach(([name, comp]) =>
      comp.adopt(this, name)
    )
  }

  public startAllServices() {
    this.assertAdopted()
    this.getServices().forEach((srv) => {
      console.log(
        `starting service ${this.ref.pkg.nodePkg.name}@${this.ref.pkg.nodePkg.version}/${this.ref.name}/${this.ref.name}`
      )
      srv.def.start()
    })
  }

  public getServices() {
    return Object.values(this.def.components).filter(
      (cmp): cmp is MNService => cmp instanceof MNService
    )
  }
}
