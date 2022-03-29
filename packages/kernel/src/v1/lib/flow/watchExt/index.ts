import { ExtensionDef } from '../../../extension'
import { LookupResult, PortShell } from '../../../types'

type Watcher<Ext extends ExtensionDef> = (_: LookupResult<Ext> | undefined) => void
export const watchExt = <Ext extends ExtensionDef>(shell: PortShell, extName: Ext['name'], watcher: Watcher<Ext>) => {
  trigWatch()
  return shell.listen(listenShell => {
    const src = listenShell.message.source
    if (src.extId.name === extName && ['activated', 'deactivating', 'deactivated'].includes(src.path)) {
      trigWatch()
    }
  })

  function trigWatch() {
    const lookupResult = shell.lookup(extName)
    setImmediate(() => watcher(lookupResult))
  }
}

type Cleanup = () => any
type MCleanup = Cleanup | undefined | void
type PMCleanup = MCleanup | Promise<MCleanup>
type ExtUser<Ext extends ExtensionDef> = (_: LookupResult<Ext>) => PMCleanup
export const useExtension = <Ext extends ExtensionDef>(
  shell: PortShell,
  extName: Ext['name'],
  extUser: ExtUser<Ext>,
) => {
  let cleanup: PMCleanup
  return watchExt<Ext>(shell, extName, async ext => {
    // if (!ext) {
    //   throw new Error(`TODO: Not ${extName} installed`)
    // }
    if (!ext?.active) {
      ;(await cleanup)?.()
    } else {
      cleanup = extUser(ext)
    }
  })
}
