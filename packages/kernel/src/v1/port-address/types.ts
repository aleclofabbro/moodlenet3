import { ExtensionId, ExtName, PortPath } from '../extension/types'

export type FullPortAddress = {
  extId: ExtensionId
  path: PortPath
}

export type PortAddress = {
  extName: ExtName
  path: PortPath
}
