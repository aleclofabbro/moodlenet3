import findUp from 'find-up'
import { readFileSync } from 'fs'
import type Module from 'module'
import { basename, delimiter, dirname, relative, resolve } from 'path'
import packageDirectory from 'pkg-dir'
import type { MNPackage } from './MNPackage'

// let cnt = 0
const _memo = <F extends Function>(_tag: string, fn: F): F =>
  ((arg: any) => {
    const _cache = new Map()
    const ret = _cache.has(arg) ? _cache.get(arg)! : fn(arg)
    // const c = cnt++
    // console.log(c, tag, arg.filename, ret)
    return ret
  }) as any as F
export const moduleDirOf = _memo('moduleDirOf', (_module: Module) =>
  dirname(_module.filename)
)
export const nodePkgDirOf = _memo('nodePkgDirOf', (_module: Module) =>
  packageDirectory.sync(moduleDirOf(_module))
)
export const mnPkgFileOf = _memo('mnPkgFileOf', (_module: Module) =>
  findUp.sync(['MNPackageRoot.js'], { cwd: moduleDirOf(_module) })
)
export const mnPkgDirOf = _memo('mnPkgDirOf', (_module: Module) => {
  const mnPkgFilename = mnPkgFileOf(_module)
  return mnPkgFilename && dirname(mnPkgFilename)
})
export const mnPkgOf = _memo('mnPkgOf', (_module: Module) => {
  const mnPkgFilename = mnPkgFileOf(_module)
  return mnPkgFilename && (require(mnPkgFilename).default as MNPackage)
})
export const nodePkgJsonStr = _memo('nodePkgJsonStr', (_module: Module) => {
  const nodePkgDir = nodePkgDirOf(_module)
  return nodePkgDir
    ? readFileSync(resolve(nodePkgDir, 'package.json'), 'utf-8')
    : 'undefined'
})
export const nodePkgJsonOf = _memo('nodePkgJsonOf', (_module: Module) =>
  JSON.parse(nodePkgJsonStr(_module))
)
export const mnModulePath = _memo('mnModulePath', (_module: Module) => {
  const mnPkgDir = mnPkgDirOf(_module)
  const name = basename(_module.filename)
    .split('.')
    .reverse()
    .slice(1)
    .reverse()
    .join('.')
  if (!mnPkgDir) {
    return undefined
  }
  const moduleDir = moduleDirOf(_module)
  const dirPath = relative(mnPkgDir, moduleDir)
    .split(delimiter)
    .filter((_) => !!_)
  return [...dirPath, name]
})
