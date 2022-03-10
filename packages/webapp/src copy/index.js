import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import { Ctx } from './Ctx';

const {
  Cmp,
} = require('@moodlenet/kernel/lib/v1/webapp')

console.log(Cmp)
fetch(`http://localhost:8888/_srv/_moodlenet_/pri-http/a/b`, {
  body: JSON.stringify({ k: 1111, t: 'xx' }),
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
  method: 'post',
}).then(async (r) => console.log(await r.json()))
ReactDOM.render(
  <React.StrictMode>
    <Ctx.Provider value={{ a: 'provided @+^^++@' }}>
      <Cmp />
      <App />
    </Ctx.Provider>
  </React.StrictMode>, document.querySelector('#root'));
