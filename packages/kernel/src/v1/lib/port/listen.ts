import { ExtensionDef, ExtId, ExtPortPaths, joinPointer, Pointer, PortPathPayload, splitPointer } from '../../extension'
import { versionSatisfies } from '../../extension-registry'
import { baseSplitPointer } from '../../extension/types'
import { PortShell } from '../../types'

type Listener<ExtDef extends ExtensionDef = ExtensionDef, Path extends ExtPortPaths<ExtDef> = ExtPortPaths<ExtDef>> = (
  shell: PortShell<PortPathPayload<ExtDef, Path>>,
) => void

export const port =
  <Ext extends ExtensionDef>(registererShell: PortShell) =>
  <Path extends ExtPortPaths<Ext>>(listenToPointer: Pointer<Ext, Path>, listener: Listener<Ext, Path>) => {
    const listenToSplitPointerPointer = splitPointer(listenToPointer)

    return registererShell.listen(listenShell => {
      const {
        message: { target },
      } = listenShell
      const targetSplitPointer = splitPointer(target)
      if (!(targetSplitPointer.path === listenToSplitPointerPointer.path)) {
        return
      }
      if (!versionSatisfies(targetSplitPointer.version, listenToSplitPointerPointer.version)) {
        //FIXME: What here ?
        return
      }
      if (targetSplitPointer.extName === listenToSplitPointerPointer.extName) {
        setImmediate(() => {
          const registererShellBaseSplitPointer = baseSplitPointer(registererShell.cwPointer)
          listenShell.message.managedBy = {
            extId: registererShellBaseSplitPointer.extId,
            pkgId: registererShell.pkgInfo.json,
          }
          listener(listenShell)
        })
      } else {
        listener(listenShell)
      }
    })
  }
export const ext =
  <Ext extends ExtensionDef>(shell: PortShell, extId: ExtId<Ext>) =>
  <Path extends ExtPortPaths<Ext>>(path: Path, listener: Listener<Ext, Path>) =>
    port<Ext>(shell)<Path>(joinPointer(extId, path), listener)
