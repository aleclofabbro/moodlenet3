import { Route } from 'react-router-dom';
import { AppRoute } from './types';

const RouteWithSubRoutes = ({ route: { Component, path }, k }: { route: AppRoute; k: any }) => (
  <Route path={path} key={k}>
    <Component />
  </Route>
);

export default RouteWithSubRoutes;
