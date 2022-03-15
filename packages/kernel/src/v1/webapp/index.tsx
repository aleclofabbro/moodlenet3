import type { RouterCtx } from '@moodlenet/webapp/lib/webapp/routes'
import { FC, useContext, useEffect } from 'react'
console.log('kernel - lib')

const Cmp: FC<{ RouterCtx: RouterCtx }> = ({ children, RouterCtx }) => {
  const routerCtx = useContext(RouterCtx)
  useEffect(() => {
    routerCtx.addRoute({ Component: KernelPage, path: '/kernel', label: 'kernel page' })
  }, [])
  return <>{children}</>
}

const KernelPage: FC = () => {
  return (
    <div>
      <h2>KernelPage</h2>
      <h3>...stuff</h3>
      <span>...more</span>
    </div>
  )
}

export default Cmp
