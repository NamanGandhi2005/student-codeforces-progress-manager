// client/src/components/routing/PrivateRoute.js
import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext'; // Custom hook to use AuthContext
import { Box, CircularProgress, Typography } from '@mui/material';

const PrivateRoute = ({ allowedRoles }) => {
  // allowedRoles is an optional array of strings, e.g., ['admin'] or ['student', 'admin']
  const { isAuthenticated, user, isLoading } = useAuth();
  const location = useLocation(); // To get the current location for redirecting back after login

  if (isLoading) {
    // Show a loading indicator while auth state is being determined (e.g., on app load)
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Verifying authentication...</Typography>
      </Box>
    );
  }

  if (!isAuthenticated) {
    // If not authenticated, redirect to the login page.
    // Pass the current location in state so we can redirect back after login.
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If roles are specified for this route, check if the user has one of the allowed roles.
  if (allowedRoles && (!user?.role || !allowedRoles.includes(user.role))) {
    // User is authenticated but does not have the required role.
    // Redirect to an "unauthorized" page or back to home with a message.
    return <Navigate to="/unauthorized" state={{ from: location }} replace />;
  }

  // If authenticated and (no specific roles are required OR user has an allowed role),
  // render the child routes/components.
  return <Outlet />; // <Outlet /> renders the matched child route element.
};

export default PrivateRoute;