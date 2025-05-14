import React from 'react';
import { useAuth } from './useAuth';
import { Navigate } from 'react-router-dom';

export default function AdminRoute({ children }) {
  const { user } = useAuth();
  // If user is not loaded yet, show nothing (or a loading spinner)
  if (user === null) return null;
  // If not logged in, redirect to login
  if (!user) return <Navigate to="/login" replace />;
  // If not admin, redirect to dashboard
  if (!user.admin) return <Navigate to="/" replace />;
  return children;
}
