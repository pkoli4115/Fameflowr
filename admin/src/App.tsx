import React from 'react';
import AppRoutes from './router/AppRoutes';
import AdminGate from './components/AdminGate';
import { ToastProvider, ToastBridge } from './ui/toast';

const App: React.FC = () => {
  return (
    <ToastProvider>
      {/* Bridge wires toast.success/error helpers */}
      <ToastBridge />
      <div>
        <h1 className="text-4xl font-bold text-purple-600">Admin Panel</h1>
        <AdminGate>
          <AppRoutes />
        </AdminGate>
      </div>
    </ToastProvider>
  );
};

export default App;
