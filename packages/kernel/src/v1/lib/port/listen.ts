import type { ExtensionDef, ExtPortPaths, PathPayload } from '../../extension'
import { PortShell } from '../../types'

export type Listener<
  ExtDef extends ExtensionDef = ExtensionDef,
  Path extends ExtPortPaths<ExtDef> = ExtPortPaths<ExtDef>,
> = (shell: PortShell<PathPayload<ExtDef, Path>>) => void

export const listenPort = <ExtDef extends ExtensionDef, Path extends ExtPortPaths<ExtDef>>({
  extName,
  listener,
  path,
  shell,
}: {
  shell: PortShell
  extName: ExtDef['name']
  path: Path
  listener: Listener<ExtDef, Path>
}) => {
  return shell.listen(listenShell => {
    const {
      message: { target },
    } = listenShell
    if (!(target.extName === extName && target.path === path)) {
      return
    }
    return listener(listenShell)
  })
}
