import { mCmp } from '@moodlenet/kernel/lib/v1/webapp'
import React from 'react'
import ReactDOM from 'react-dom'
import App from './App'
import { Ctx } from './Ctx'
import reportWebVitals from './reportWebVitals'
export * from './Ctx'
const Cmp = mCmp(Ctx)
console.log(Cmp)
ReactDOM.render(
  <React.StrictMode>
    <Ctx.Provider value={{ a: 'provided' }}>
      <Cmp />
      <App />
    </Ctx.Provider>
  </React.StrictMode>,
  document.getElementById('root')
)
// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals()
