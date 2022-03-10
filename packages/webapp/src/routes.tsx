import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import MainLayout from './layout/MainLayout';
import { AppRoute } from './types';

const Home = lazy(() => import('./pages/home/Home'));
const About = lazy(() => import('./pages/about/About'));
const Contact = lazy(() => import('./pages/contact/Contact'));

const routes: AppRoute[] = [
  {
    path: '/',
    Component: Home,
  },
  {
    path: '/about',
    Component: About,
  },
  {
    path: '/contact',
    Component: Contact,
  },
];
const AppRouter = () => {
  return (
    <Router>
      <MainLayout>
        <Routes>
          {routes.map(({ Component, path }, k) => (
            <Route
              path={path}
              key={k}
              element={
                <Suspense fallback={<div className="lazy-loading">Loading...</div>}>
                  <Component />
                </Suspense>
              }
            />
          ))}
        </Routes>
      </MainLayout>
    </Router>
  );
};

export default AppRouter;
