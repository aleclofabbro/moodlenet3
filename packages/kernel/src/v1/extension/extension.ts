import { registerExtension } from '../extension-registry/lib'
import { pkgInfoOf } from '../pkg-info'
import { ExtensionDef } from './types'

export function Extension<ExtDef extends ExtensionDef>(
  node_module: NodeModule,
  def: ExtDef
) {
  const pkgInfo = pkgInfoOf(node_module)
  if (def.name !== pkgInfo.json.name) {
    throw new Error(
      `package.json name and provided extension name must exactly match !`
    )
  }
  if (def.version !== pkgInfo.json.version) {
    throw new Error(
      `package.json version and provided extension version must exactly match !`
    )
  }

  return registerExtension<ExtDef>({ pkgInfo, def })
}
