import type { MNPackage } from './MNPackage'

const packages: MNPackage[] = []

export const registerPackage = (mnPkg: MNPackage) => packages.push(mnPkg)

export const startAllSrv = () =>
  packages.forEach((mnPkg) =>
    Object.values(mnPkg.def.modules).forEach((mod) => {
      mod.startAllServices()
    })
  )

require('@moodlenet/pri-http')

startAllSrv()
