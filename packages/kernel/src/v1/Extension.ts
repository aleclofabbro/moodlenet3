import { registerExtension } from './ExtLocalRegistry'
import { PkgInfo, pkgInfoOf } from './pkg-info'

export interface ExtensionShell {
  pkgName(): string
  pkgVersion(): string
}
function extensionShell(pkgInfo: PkgInfo): ExtensionShell {
  return {
    pkgName: () => pkgInfo.pkg_json.name,
    pkgVersion: () => pkgInfo.pkg_json.version,
  }
}

export interface ExtLifeCycle {
  install(): Promise<unknown>
  start(): Promise<unknown>
  stop(): Promise<unknown>
  uninstall(): Promise<unknown>
}

export interface Extension {
  pkgInfo: PkgInfo
  lifecycle: ExtLifeCycle
  topology: any
}
export interface Define<Topology, _SysState> {
  (): [Partial<ExtLifeCycle>, Topology]
}

let currentExtShell: ExtensionShell | null = null
export function assertCurrentExtShell() {
  if (!currentExtShell) {
    throw new Error(`no currentExtShell`)
  }
  return currentExtShell
}

const _nooplifecycle = async () => null
export function Extension<Topology, ExtState>(
  node_module: NodeModule,
  define: Define<Topology, ExtState>
) {
  const pkgInfo = pkgInfoOf(node_module)
  const shell = extensionShell(pkgInfo)

  currentExtShell = shell
  const [_lifecycle, topology] = define()
  currentExtShell = null
  const lifecycle: ExtLifeCycle = {
    install: _nooplifecycle,
    start: _nooplifecycle,
    stop: _nooplifecycle,
    uninstall: _nooplifecycle,
    ..._lifecycle,
  }

  registerExtension({
    lifecycle,
    pkgInfo,
    topology,
  })

  return topology
}
