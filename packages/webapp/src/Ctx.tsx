import { createContext } from 'react'

export type Ctx = typeof Ctx
export const Ctx = createContext({ a: 'default' })
