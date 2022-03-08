import type { Ctx } from '@moodlenet/webapp/src/Ctx'
import { FC, useContext } from 'react'
console.log('kernel lib')

export const mCmp = (context: Ctx): FC => {
  return ({ children }) => {
    const ctx = useContext(context)
    return (
      <div>
        [[ kernel: {ctx.a} ]]
        {children}
      </div>
    )
  }
}
