import { registerExtension } from '../extension-registry/lib'
import { pkgInfoOf } from '../pkg-info'
import { ExtensionDef, ExtensionId, ExtLifeCycleHandle } from './types'

type IdOf<ExtDef extends ExtensionDef> = Pick<ExtDef, keyof ExtensionId>
export function Extension<ExtDef extends ExtensionDef>(
  node_module: NodeModule,
  id: IdOf<ExtDef>,
  lifeCycle: ExtLifeCycleHandle,
) {
  const pkgInfo = pkgInfoOf(node_module)

  return registerExtension<IdOf<ExtDef>>({ pkgInfo, id, lifeCycle })
}
