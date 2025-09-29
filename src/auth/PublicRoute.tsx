import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Center, Loader } from '@mantine/core';
import { useAuth } from './useAuth';

interface PublicRouteProps {
  children: ReactNode;
  redirectTo?: string;
}

export default function PublicRoute({ children, redirectTo = '/admin/dashboard' }: PublicRouteProps) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <Center h="100vh" w="100vw">
        <Loader size="xl" color="blue" />
      </Center>
    );
  }

  // If user is authenticated, redirect to dashboard or intended destination
  if (user) {
    // Check if there's a return URL from the location state
    const from = location.state?.from || redirectTo;
    return <Navigate to={from} replace />;
  }

  // If user is not authenticated, render the public content (like login page)
  return <>{children}</>;
}
