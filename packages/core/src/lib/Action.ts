import { uid } from './uid'

const SYMBOL_ACTION = Symbol('Action')
export interface ActionDef<Payload = any> {
  mainMW(_: Action<Payload>): unknown
}

export interface Action extends ActionDef {
  readonly [SYMBOL_ACTION]: typeof SYMBOL_ACTION
}

export const isAction = (_: any): _ is Action =>
  _ && _[SYMBOL_ACTION] === SYMBOL_ACTION

export const Action = (actionDef: ActionDef): Action => {
  return { ...actionDef, [SYMBOL_ACTION]: SYMBOL_ACTION }
}

export interface Action<
  Payload = unknown,
  Pkg extends string = string,
  Type extends string = string
> {
  uid: string
  pkg: Pkg
  type: Type
  payload: Payload
  date: Date
}

export const createAction = <Payload, Pkg extends string, Type extends string>({
  pkg,
  type,
  payload,
}: {
  pkg: Pkg
  type: Type
  payload: Payload
}) => {
  const action: _Action = {
    uid: uid(),
    pkg,
    type,
    payload,
    date: new Date(),
  }
  return action
  type _Action = Action<Payload, Pkg, Type>
}
