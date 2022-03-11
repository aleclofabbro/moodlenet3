import { inspect } from 'util'
import { ShellGatedExtension } from '../../../extension'
import { ExtensionRegistryRecord } from '../../../extension-registry'
import { PortShell } from '../../../types'

type Watcher<Ext extends ExtensionRegistryRecord<any>> = (ext: ShellGatedExtension<Ext['def']> | undefined) => unknown
export const watchExt = <Ext extends ExtensionRegistryRecord<any>>(
  shell: PortShell,
  extName: Ext['def']['name'],
  watcher: Watcher<Ext>,
) => {
  trigWatch()
  return shell.listen(shell => {
    console.log('watchExt', inspect(shell, false, 8, true))
    const trg = shell.message.target
    if (trg.extId.name === extName && ['activate', 'deactivate'].includes(trg.path.join('::'))) {
      //FIXME: AHHAHHA
      setTimeout(trigWatch, 2000)
    }
  })

  function trigWatch() {
    const gatedExt = shell.lookup(extName)
    setImmediate(()=>watcher(gatedExt))
  }
}
