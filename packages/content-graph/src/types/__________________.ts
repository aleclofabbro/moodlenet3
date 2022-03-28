try {
  reboot()
} catch (err) {
  console.error(err)
}

function reboot() {
  const cwd = process.cwd()
  const kernel_mod_file = resolve(cwd, 'KERNEL_MOD')

  const handle = {
    pkg_add,
    pkg_rm,
    pkg_update,
    set_kernel_mod,
    get_kernel_mod,
    reboot,
  }

  createRequire(cwd)(get_kernel_mod()).default(handle)

  function set_kernel_mod(kernelMod) {
    return writeFileSync(kernel_mod_file, kernelMod)
  }
  function get_kernel_mod() {
    return readFileSync(kernel_mod_file)
  }
}
