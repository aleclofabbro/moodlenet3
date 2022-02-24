import makeyarncli from './npm-cli'

export const rootDir = process.env.MOODLENET_PKG_MNG_ROOT_DIR
if (!rootDir) {
  throw new Error(
    `pkg-mng: needs a valid process.env.PKG_MNG_ROOT_DIR: ${process.env.PKG_MNG_ROOT_DIR}`
  )
}
export const moodlenetKernelVersion =
  process.env.MOODLENET_PKG_MNG_KERNEL_VERSION
export const moodlenetPkgMngDevKernelPkgLoc =
  process.env.MOODLENET_PKG_MNG_DEV_KERNEL_PKG_LOC
if (!(moodlenetPkgMngDevKernelPkgLoc || moodlenetKernelVersion)) {
  throw new Error(
    `pkg-mng: needs either a valid :
    process.env.PKG_MNG_ROOT_DIR: ${process.env.PKG_MNG_ROOT_DIR}
    or 
    process.env.MOODLENET_PKG_MNG_KERNEL_VERSION: ${process.env.MOODLENET_PKG_MNG_KERNEL_VERSION}
    `
  )
}
console.log({
  rootDir,
  moodlenetKernelVersion,
  moodlenetPkgMngDevKernelPkgLoc,
})
;(async () => {
  const npmcli = await makeyarncli(rootDir)
  const kernelInstallRef =
    moodlenetPkgMngDevKernelPkgLoc ??
    `@moodlenet/kernel@${moodlenetKernelVersion}`

  console.log(`installing kernel from ${kernelInstallRef}`)

  await npmcli.install([kernelInstallRef], false)

  const MNBareMetal = { npmcli, rootDir, kernelInstallRef }
  console.log(`starting kernel`)

  await require(`${rootDir}/node_modules/@moodlenet/kernel`).default(
    MNBareMetal
  )
  console.log(`kernel ${kernelInstallRef} started`)
})()
