import type { RouterCtx } from '@moodlenet/webapp/lib/webapp/routes'
import { FC, useContext, useEffect } from 'react'

const Cmp: FC<{ RouterCtx: RouterCtx }> = ({ children, RouterCtx }) => {
  const routerCtx = useContext(RouterCtx)
  useEffect(() => {
    routerCtx.addRoute({ Component: TestExtPage, path: '/test-extension', label: 'test-extension page' })
  }, [])
  return <>{children}</>
}

const TestExtPage: FC = () => {
  return (
    <div>
      <h2>Test Extension</h2>
      <h3>...stuff</h3>
      <span>...more</span>
    </div>
  )
}

export default Cmp
