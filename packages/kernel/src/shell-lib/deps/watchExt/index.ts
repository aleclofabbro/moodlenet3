import type { ExtensionRegistryRecord, ExtId, ExtNameOf, ExtTopoNodePaths, KernelExt, PortShell } from '../../../types'
import { splitExtId, splitPointer } from '../../pointer'

type Watcher<_ExtId extends ExtId> = (_: ExtensionRegistryRecord<_ExtId> | undefined) => void

const ACTIVATED_PATH: ExtTopoNodePaths<KernelExt> = 'extensions/activate/rpcTopoResponse'
const DEACTIVATED_PATH: ExtTopoNodePaths<KernelExt> = 'extensions/deactivate/rpcTopoResponse'
const KERNEL_EXT_NAME: ExtNameOf<KernelExt> = '@moodlenet/kernel'
export const watchExt = <_ExtId extends ExtId>(shell: PortShell, extId: _ExtId, watcher: Watcher<_ExtId>) => {
  const splitWatchingExtId = splitExtId(extId)
  trigWatch()
  //TODO: rather use probe() ?
  return shell.listen(listenShell => {
    const srcSplitPointer = splitPointer(listenShell.message.source)
    const trgSplitPointer = splitPointer(listenShell.message.target)
    if (
      srcSplitPointer.extName === splitWatchingExtId.extName &&
      trgSplitPointer.extName === KERNEL_EXT_NAME &&
      (ACTIVATED_PATH === trgSplitPointer.path || DEACTIVATED_PATH === trgSplitPointer.path)
    ) {
      setImmediate(trigWatch) //TODO: WHY SET IMMEDIATE?
    }
  })

  function trigWatch() {
    const extRecord = shell.registry.getRegisteredExtension(splitWatchingExtId.extName)
    if (!extRecord) {
      return
    }
    //TODO: where to check versioning? def & impl `requires()` , `xxX()`
    // const regRecSplitExtId = splitExtId(extRecord.extId)
    // if (!isVerBWC(regRecSplitExtId.version, splitWatchingExtId.version)) {
    //   return
    // }
    watcher(extRecord as any)
  }
}

type Cleanup = () => any
type MCleanup = Cleanup | undefined | void
type PMCleanup = MCleanup | Promise<MCleanup>
type ExtUser<_ExtId extends ExtId> = (_: ExtensionRegistryRecord<_ExtId>) => PMCleanup
export const useExtension = <_ExtId extends ExtId>(shell: PortShell, extId: _ExtId, extUser: ExtUser<_ExtId>) => {
  let cleanup: PMCleanup
  return watchExt<_ExtId>(shell, extId, async ext => {
    if (!ext?.deployment) {
      ;(await cleanup)?.()
    } else {
      cleanup = extUser(ext)
    }
  })
}
