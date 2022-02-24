import chproc from 'child_process'
import { promisify } from 'util'

const exe = promisify(chproc.exec)
export default async (rootDir: string) => {
  const exe_opts = { cwd: rootDir }
  await exe('npm init -y', exe_opts)
  // await exe('npm install', exe_opts)

  const install = async (pkgs: string[], strict = true) => {
    const cmd = `npm install -s ${
      strict ? '--strict-peer-deps' : ''
    } ${pkgs.join(' ')}`
    console.log({
      'bare metal': 'install pkg',
      cmd,
      ...(await exe(cmd, exe_opts)),
    })
  }

  const uninstall = async (pkgs: string[]) => {
    const cmd = `npm rm ${pkgs.join(' ')}`
    console.log({
      'bare metal': 'uninstall pkg',
      cmd,
      ...(await exe(cmd, exe_opts)),
    })
  }
  return { install, uninstall }
}
