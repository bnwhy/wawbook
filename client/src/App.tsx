import React from 'react';
import { useSubdomain } from './hooks/useSubdomain';
import PublicApp from './apps/PublicApp';
import AdminApp from './apps/AdminApp';
import { Switch, Route } from 'wouter';

const App: React.FC = () => {
  const siteMode = useSubdomain();

  if (siteMode === 'admin') {
    return <AdminApp />;
  }

  return (
    <Switch>
      <Route path="/admin">
        <AdminApp />
      </Route>
      <Route>
        <PublicApp />
      </Route>
    </Switch>
  );
};

export default App;
