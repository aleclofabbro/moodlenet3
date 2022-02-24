import { createRequire } from 'module'
import { ExtensionRegistry } from './v1/ExtLocalRegistry'
type MNBareMetal = any /*  { npmcli: {
  install()...
} } */
export default async ({ npmcli, rootDir }: MNBareMetal) => {
  const _req = createRequire(rootDir + '/node_modules')
  await npmcli.install([
    //`@moodlenet/pri-http`,
    `/home/alec/MOODLENET/repo/moodlenet3/packages/pri-http`,
  ])
  _req('@moodlenet/pri-http')

  Object.entries(ExtensionRegistry).forEach(([rootDir, ext]) => {
    console.log(
      `starting ${ext.pkgInfo.pkg_json.name}@${ext.pkgInfo.pkg_json.version} - [${rootDir}]`
    )
    ext.lifecycle.start()
  })
}
