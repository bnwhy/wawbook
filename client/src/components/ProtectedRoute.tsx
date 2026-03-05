import React, { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLocation } from 'wouter';
import { Skeleton } from './ui/skeleton';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const [location, setLocation] = useLocation();
  const currentPath = location.split('?')[0]; // Remove query params if any

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      // Redirect to login with return path
      setLocation(`/login?redirect=${encodeURIComponent(currentPath)}`);
    }
  }, [isAuthenticated, isLoading, currentPath, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-stone-50">
        <Skeleton className="h-16 w-full rounded-none" />
        <div className="flex-1 max-w-5xl mx-auto w-full px-6 py-12 space-y-6">
          <Skeleton className="h-48 w-full rounded-2xl" />
          <div className="flex gap-6">
            <Skeleton className="h-64 w-72 rounded-2xl shrink-0" />
            <Skeleton className="h-64 flex-1 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect via useEffect
  }

  return <>{children}</>;
};

export default ProtectedRoute;
