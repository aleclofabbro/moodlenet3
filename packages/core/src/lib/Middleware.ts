import { Action } from './Action'

interface MiddlewareFn {
  (_: Action, next: () => unknown): unknown
}
export interface MiddlewareDef {
  mw: MiddlewareFn
}

const SYMBOL_MIDDLEWARE = Symbol('Middleware')
export interface Middleware extends MiddlewareDef {
  readonly [SYMBOL_MIDDLEWARE]: typeof SYMBOL_MIDDLEWARE
}
export const isMiddleware = (_: any): _ is Middleware =>
  _ && _[SYMBOL_MIDDLEWARE] === SYMBOL_MIDDLEWARE

export const Middleware = (mwDef: MiddlewareDef): Middleware => {
  return { ...mwDef, [SYMBOL_MIDDLEWARE]: SYMBOL_MIDDLEWARE }
}
