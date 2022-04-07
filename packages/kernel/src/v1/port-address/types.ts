import { ExtensionIdObj, ExtName, TopoPath } from '../extension/types'

export type FullPortAddress = {
  extId: ExtensionIdObj
  path: TopoPath
}

export type PortAddress = {
  extName: ExtName
  path: TopoPath
}
