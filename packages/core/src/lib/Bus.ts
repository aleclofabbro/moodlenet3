import { Action } from './Action'

export interface EmitOpts {}
export interface EnqueueOpts {}
export interface Bus {
  emit(action: Action, opts?: EmitOpts): unknown
  onAction(_: (action: Action) => unknown): unknown
}

export default null
