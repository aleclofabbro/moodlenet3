import { isVerBWC, splitExtId } from '../k/pointer'
import type { ExtDef, ExtId, ExtPackage, PkgRegistry } from '../types'

export function findExt<Def extends ExtDef>(pkgRegistry: PkgRegistry, findExtId: ExtId<Def>) {
  const findExtIdSplit = splitExtId(findExtId)

  return pkgRegistry
    .map(pkgReg => {
      const matchingExts = pkgReg.exts.filter(currExt => {
        const currExtIdSplit = splitExtId(currExt.id)
        const nameMatch = currExtIdSplit.extName === findExtIdSplit.extName
        if (!nameMatch) {
          return false
        }
        const verMatch = isVerBWC(currExtIdSplit.version, findExtIdSplit.version)
        if (!verMatch) {
          return false
        }
        return currExt
      })
      if (!matchingExts.length) {
        return null
      }
      const match: ExtPackage = {
        ...pkgReg,
        exts: matchingExts,
      }
      return match
    })
    .filter((_): _ is ExtPackage => !!_)
}

export function assertFindExt<Def extends ExtDef>(pkgRegistry: PkgRegistry, findExtId: ExtId<Def>) {
  const matches = findExt<Def>(pkgRegistry, findExtId)

  if (!matches.length) {
    throw new Error(`no extension matching [${findExtId}] found in pkgRegistry`)
  }

  return matches
}
