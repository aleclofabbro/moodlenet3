import { ExtensionId } from '../extension/types'

type Path = string[]
export type PortAddress = {
  extId: ExtensionId
  path: Path
}
