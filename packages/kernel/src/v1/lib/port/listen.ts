import {
  ExtensionDef,
  ExtId,
  ExtPortPaths,
  joinPointer,
  Pointer,
  PortPathPayload,
  splitExtId,
  splitPointer,
} from '../../extension'
import { PortShell } from '../../types'

type Listener<ExtDef extends ExtensionDef = ExtensionDef, Path extends ExtPortPaths<ExtDef> = ExtPortPaths<ExtDef>> = (
  shell: PortShell<PortPathPayload<ExtDef, Path>>,
) => void

export const port =
  <Ext extends ExtensionDef>(shell: PortShell) =>
  <Path extends ExtPortPaths<Ext>>(pointer: Pointer<Ext, Path>, listener: Listener<Ext, Path>) => {
    const [extId, path] = splitPointer(pointer)
    const [extName, _version] = splitExtId(extId)

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

export const ext =
  <Ext extends ExtensionDef>(shell: PortShell, extId: ExtId<Ext>) =>
  <Path extends ExtPortPaths<Ext>>(path: Path, listener: Listener<Ext, Path>) =>
    port<Ext>(shell)<Path>(joinPointer(extId, path), listener)
