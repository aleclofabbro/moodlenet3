import { readFileSync, writeFileSync } from 'fs'
import { createRequire } from 'module'
import { resolve } from 'path'
import makePkgMng from './pkg-mng'
import { PkgMngHandle } from './types'
try {
  reboot()
} catch (err) {
  console.error(err)
}

function reboot() {
  const cwd = process.env.MN_PKG_MNG_CWD ?? process.cwd()
  const pkgMng = makePkgMng(cwd)
  const kernel_mod_file = resolve(cwd, 'KERNEL_MOD')
  const kernel_mod_path = get_kernel_mod()

  console.log(`PKG-MNG:`, { cwd, kernel_mod_path })
  const modRequire = createRequire(resolve(cwd, 'node_modules'))

  const handle: PkgMngHandle = {
    pkg_add: pkgMng.install,
    pkg_rm: pkgMng.uninstall,
    // pkg_update,
    set_kernel_mod,
    get_kernel_mod,
    reboot,
    modRequire,
    cwd,
  }

  const kernelMod = modRequire(kernel_mod_path)
  kernelMod.boot(handle)

  function set_kernel_mod(kernelMod: string) {
    return writeFileSync(kernel_mod_file, kernelMod, 'utf-8')
  }
  function get_kernel_mod() {
    return readFileSync(kernel_mod_file, 'utf-8')
  }
}
