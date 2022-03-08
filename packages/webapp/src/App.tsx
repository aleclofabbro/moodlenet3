import { useContext } from 'react'
import { Ctx } from './Ctx'

function App() {
  const ctx = useContext(Ctx)
  return (
    <div>
      <div>******************* APP *************************</div>
      <h5>{ctx.a}</h5>
    </div>
  )
}

export default App
