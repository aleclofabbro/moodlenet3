import { ActionDef } from './Action'
import { MiddlewareDef } from './Middleware'
import { ServiceDef } from './Service'

const SYMBOL_MODULE = Symbol('Module')

type ModuleComponent = ServiceDef | MiddlewareDef | ActionDef
export interface ModuleDef {
  [compName: string]: ModuleComponent
}

export interface Module extends ModuleDef {
  readonly [SYMBOL_MODULE]: typeof SYMBOL_MODULE
}

export const isModule = (_: any): _ is Module =>
  _ && _[SYMBOL_MODULE] === SYMBOL_MODULE

export const Module = (srv: ModuleDef): Module => {
  return { ...srv, [SYMBOL_MODULE]: SYMBOL_MODULE }
}
