import { FC, useContext } from 'react'
const { Ctx } = require('@moodlenet/webapp/src/Ctx')
console.log('kernel - lib')

export const Cmp: FC = ({ children }) => {
  const ctx = useContext(Ctx) as any
  return (
    <div>
      [[ kernel ++ : {ctx.a} ]]
      {children}
    </div>
  )
}
