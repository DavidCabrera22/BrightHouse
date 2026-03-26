import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

const ProtectedRoute: React.FC = () => {
  const token = localStorage.getItem('access_token');

  // Clean up invalid token strings that may have been stored on failed logins
  if (!token || token === 'undefined' || token === 'null') {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_role');
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
