/* import type { ExtDef, ExtId, Pointer, PortPathData, PortPaths, SemanticPointer, Skell } from '../../types'
import { isBWCSemanticallySamePointers, joinPointer, joinSemanticPointer } from '../pointer'

export type Listener<Def extends ExtDef = ExtDef, Path extends PortPaths<Def> = PortPaths<Def>> = (
  shell: Skell<PortPathData<Def, Path>>,
) => void

export type ListenOpts = {
  consume: boolean
}

const consumers: Record<SemanticPointer, Pointer> = {}

export function probePort<Ext extends ExtDef>(registererShell: Skell) {
  return <Path extends PortPaths<Ext>>(
    listenToPointer: Pointer<Ext, Path>,
    listener: Listener<Ext, Path>,
    _opts?: Partial<ListenOpts>,
  ) => {
    const defListenOpts: ListenOpts = {
      consume: false,
    }

    const opts: ListenOpts = { ...defListenOpts, ..._opts }
    const listeningSemanticPointer = joinSemanticPointer(listenToPointer)
    if (opts.consume) {
      const presentConsumer = consumers[listeningSemanticPointer]
      if (presentConsumer) {
        throw new Error(`can't have more than 1 consumer for pointer ${listeningSemanticPointer}
got a consumer @${registererShell.cwPointer}
but one already registered @${presentConsumer}`)
      }
    }

    const unsubscribe = registererShell.listen(listenShell => {
      const {
        message: { target },
      } = listenShell
      const bwcSplitPointers = isBWCSemanticallySamePointers(target, listenToPointer)
      if (!bwcSplitPointers) {
        //FIXME: What here ?
        return
      }
      if (opts.consume) {
        setImmediate(() => {
          if (listenShell.message.consumedBy) {
            throw new Error(`[SHOULD NEVER HAPPEN] @${registererShell.cwPointer} attempting to mark consumed ${listenToPointer} but 
already marked by @${listenShell.message.consumedBy.pointer} from pkg "${listenShell.message.consumedBy.pkgId.name}@${listenShell.message.consumedBy.pkgId.version}@"`)
          }
          listenShell.message.consumedBy = {
            pointer: registererShell.cwPointer,
            pkgId: {
              name: registererShell.pkgInfo.name,
              version: registererShell.pkgInfo.version,
              //TODO: processId: getProcessId()
            },
          }
          listener(listenShell)
        })
      } else {
        listener(listenShell)
      }
    }) as any
    return () => {
      if (opts.consume) {
        delete consumers[listeningSemanticPointer]
      }
      return unsubscribe()
    }
  }
}
export function probeExt<Ext extends ExtDef>(shell: Skell, extId: ExtId<Ext>) {
  return <Path extends PortPaths<Ext>>(path: Path, listener: Listener<Ext, Path>) =>
    probePort<Ext>(shell)<Path>(joinPointer(extId, path), listener)
}
 */
export default null