import type { RouterCtx } from '@moodlenet/webapp/lib/webapp/routes'
import { FC, useCallback, useContext, useEffect, useState } from 'react'
console.log('kernel - lib')

const Cmp: FC<{ RouterCtx: RouterCtx }> = ({ children, RouterCtx }) => {
  const routerCtx = useContext(RouterCtx)
  useEffect(() => {
    routerCtx.addRoute({ Component: KernelPage, path: '/kernel', label: 'kernel page' })
  }, [])
  return <>{children}</>
}

const KernelPage: FC = () => {
  const [pkgId, setPkgId] = useState('')
  const [pkgLoc, setPkgLoc] = useState('')
  const install = useCallback(() => {
    const atIndex = pkgId.lastIndexOf('@')
    if (!atIndex) {
      alert(`invalid pkg:${pkgId}`)
    }
    const name = pkgId.substring(0, atIndex)
    const version = pkgId.substring(atIndex + 1)
    if (!(name && version)) {
      alert(`invalid pkg:${pkgId}`)
      return
    }
    const extId = { name, version }

    fetch(`http::localhost:8888/_srv/_moodlenet_/kernel/extensions/installAndActivate`, {
      body: JSON.stringify({ extId, pkgLoc: pkgLoc || undefined }),
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      method: 'post',
    })
      .then(async _ => {
        if (_.status >= 400) {
          throw new Error(await _.text())
        }
        alert(`${pkgId} installed and activated, wait for webapp rebuild`)
      })
      .catch(err => alert(`Error installing ${pkgId}:\n${err}`))
  }, [pkgId, pkgLoc])
  return (
    <div>
      <h2>KernelPage</h2>
      <hr />
      <span>install pkg (name@version)</span>
      <input onChange={({ currentTarget: { value } }) => setPkgId(value)} type="text" />
      <span>pkg location (optional)</span>
      <input onChange={({ currentTarget: { value } }) => setPkgLoc(value)} type="text" />
      <button onClick={install}>install</button>
    </div>
  )
}

export default Cmp
