export type PkgInfo = {
  name: string
  version: string
}

export type PkgDiskInfo = PkgInfo & {
  rootDir: string
  mainModPath: string
}
