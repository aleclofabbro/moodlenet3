import { registerExtension } from '../extension-registry/lib'
import { pkgInfoOf } from '../pkg-info'
import { ExtensionDef, ExtIdOf, ExtLifeCycleHandle } from './types'

export function Extension<ExtDef extends ExtensionDef>(
  node_module: NodeModule,
  id: ExtIdOf<ExtDef>,
  lifeCycle: ExtLifeCycleHandle,
) {
  const pkgInfo = pkgInfoOf(node_module)

  registerExtension<ExtIdOf<ExtDef>>({ pkgInfo, id, lifeCycle })
}
