import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { LoadingState } from '../components/common/States.js';

interface ProtectedRouteProps {
  children: React.ReactElement;
  requiredRole?: 'parent' | 'accounts_executive';
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRole }) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <LoadingState message="Verifying session security..." />;
  }

  if (!isAuthenticated || !user) {
    const redirectPath = requiredRole === 'accounts_executive' ? '/accounts/login' : '/parent/login';
    return <Navigate to={redirectPath} state={{ from: location }} replace />;
  }

  if (requiredRole === 'parent' && user.role !== 'parent') {
    return <Navigate to="/accounts" replace />;
  }

  if (
    requiredRole === 'accounts_executive' &&
    user.role !== 'accounts_executive' &&
    user.role !== 'super_admin'
  ) {
    return <Navigate to="/parent" replace />;
  }

  return children;
};

