import { FC, useContext } from 'react';
import { hot } from 'react-hot-loader';
import { Ctx } from './Ctx';
import AppRouter from './routes';

const App: FC = () => {
  const ctx = useContext(Ctx);
  return (
    <div>
      <div>******************* APP *************************</div>
      <h5>{ctx.a}</h5>

      <AppRouter></AppRouter>
    </div>
  );
};

export default hot(module)(App);
