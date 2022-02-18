const SYMBOL_SERVICE = Symbol('Service')
export interface ServiceDef {
  start(): Promise<unknown>
}

export interface Service extends ServiceDef {
  readonly [SYMBOL_SERVICE]: typeof SYMBOL_SERVICE
}

export const isService = (_: any): _ is Service =>
  _ && _[SYMBOL_SERVICE] === SYMBOL_SERVICE

export const Service = (srv: ServiceDef): Service => {
  return { ...srv, [SYMBOL_SERVICE]: SYMBOL_SERVICE }
}
