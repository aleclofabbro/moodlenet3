import { createRequire } from 'module'
import { join } from 'path'
import { create } from './kernel-core'
import { pkgDiskInfoOf } from './npm-pkg'
import { Ext } from './types'
export function boot() {
  const cwd = process.cwd()
  const cfgPath = process.env.KERNEL_ENV_MOD ?? `${cwd}/kernel-env-mod`
  const global_env: Record<string, any> = require(cfgPath)
  const K = create({ global_env })
  const activatePkgs = global_env['kernel.core.node'].activatePkgs as string[]
  console.log({ activatePkgs, cwd, global_env })
  const req = createRequire(join(cwd, 'node_modules'))

  activatePkgs
    .map(mainModPath => pkgDiskInfoOf(mainModPath))
    .forEach(pkgDiskInfo => {
      console.log({ _: pkgDiskInfo })
      const exts: Ext[] = req(pkgDiskInfo.name).default
      console.log({ exts })
      exts.forEach(ext => K.startExtension({ ext, pkgInfo: pkgDiskInfo }))
    })
}
