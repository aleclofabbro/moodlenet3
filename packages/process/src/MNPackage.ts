import Module from 'module'
import { PackageJson } from 'type-fest'
import { MNModule } from './MNModule'
import { nodePkgJsonOf } from './pkg-mod-utils'
import { registerPackage } from './process'

type MNPackageJson = PackageJson

export interface MNPackageDef {
  modules: Record<string, MNModule>
}

export class MNPackage {
  public nodePkg: MNPackageJson
  constructor(_module: Module, public def: MNPackageDef) {
    this.nodePkg = nodePkgJsonOf(_module)
    Object.entries(this.def.modules).forEach(([name, mod]) =>
      mod.adopt(this, name)
    )
    registerPackage(this)
  }
}
