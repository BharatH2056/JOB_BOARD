import React from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Spinner } from '../ui/Spinner';
import { ShieldAlert } from 'lucide-react';
import { Button } from '../ui/Button';

export const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 'calc(100vh - var(--navbar-h))',
          paddingTop: 'var(--navbar-h)',
        }}
      >
        <Spinner size={32} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
    return (
      <div
        className="container"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 'calc(100vh - var(--navbar-h))',
          paddingTop: 'var(--navbar-h)',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: 'var(--red-bg)',
            color: 'var(--red)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 'var(--space-4)',
          }}
        >
          <ShieldAlert size={32} />
        </div>
        <h2 style={{ marginBottom: 'var(--space-2)' }}>Access Restricted</h2>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '400px', marginBottom: 'var(--space-6)' }}>
          Your current account role (<strong>{user?.role}</strong>) does not have permission to view this page.
        </p>
        <Link to="/" style={{ textDecoration: 'none' }}>
          <Button variant="primary">Return Home</Button>
        </Link>
      </div>
    );
  }

  return children;
};
