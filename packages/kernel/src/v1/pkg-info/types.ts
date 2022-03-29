// import { PackageJson } from 'type-fest'

export type PkgInfo = {
  dir: string
  json: NodePackageJson
}

export type MNPackageJsonExt = {
  displayName?: string
  shortDesc?: string
  description?: string
  webappExtensionFile?: string
}

export type NodePackageJson = /* Omit<PackageJson, 'name' | 'version'> & */ {
  // moodlenet: MNPackageJsonExt
  name: string
  version: string
}
