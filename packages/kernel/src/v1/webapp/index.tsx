import { Ctx } from '@moodlenet/webapp/lib/webapp/Ctx'
import { FC, useContext } from 'react'
console.log('kernel - lib')

export const Cmp: FC = ({ children }) => {
  const ctx = useContext(Ctx) as any
  return (
    <div>
      [[ kernel +-@@-+ : {ctx.a} ]]
      {children}
    </div>
  )
}
