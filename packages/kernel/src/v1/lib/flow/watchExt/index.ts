import { ExtensionDef } from '../../../extension'
import { LookupResult, PortShell } from '../../../types'

type Watcher<Ext extends ExtensionDef> = (_: LookupResult<Ext>) => void
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
