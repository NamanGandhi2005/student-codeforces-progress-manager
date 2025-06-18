// client/src/App.js
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Box, Container, Typography } from '@mui/material';

// Import Page components
import StudentListPage from './pages/StudentListPage';
import StudentProfilePage from './pages/StudentProfilePage';
import AdminPage from './pages/AdminPage';
import LoginPage from './pages/LoginPage';   // Ensure this is imported
import RegisterPage from './pages/RegisterPage'; // Ensure this is imported

// Import Navbar
import Navbar from './components/common/Navbar';
// --- IMPORT PrivateRoute ---
import PrivateRoute from './components/routing/PrivateRoute'; // Ensure this path is correct

// Simple placeholder for a 404 page
const NotFoundPage = () => (
  <Box sx={{ p: 3, textAlign: 'center', mt: 5 }}>
    <Typography variant="h4" component="h1" gutterBottom>404 - Page Not Found</Typography>
    <Typography variant="body1">Sorry, the page you are looking for does not exist.</Typography>
  </Box>
);

// Simple placeholder for Unauthorized page
const UnauthorizedPage = () => (
  <Box sx={{ p: 3, textAlign: 'center', mt: 5 }}>
    <Typography variant="h4" component="h1" gutterBottom color="error">403 - Unauthorized</Typography>
    <Typography variant="body1">You do not have permission to access this page.</Typography>
  </Box>
);


function App() {
  return (
    <> {/* React Fragment */}
      <Navbar /> {/* Navbar will be updated later to show Login/Logout based on auth state */}
      <Container maxWidth="xl" sx={{ mt: 3, mb: 4 }}>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />

          {/* --- PROTECTED ROUTES - Accessible by any authenticated user --- */}
          <Route element={<PrivateRoute />}>  {/* General authenticated users */}
            <Route path="/" element={<StudentListPage />} />
            <Route path="/student/:studentId" element={<StudentProfilePage />} />
            {/* Add other general authenticated routes here if any */}
          </Route>

          {/* --- ADMIN ONLY PROTECTED ROUTES --- */}
          <Route element={<PrivateRoute allowedRoles={['admin']} />}> {/* Admin users only */}
            <Route path="/admin/settings" element={<AdminPage />} />
            {/* Student CRUD actions will be conditionally rendered within StudentListPage */}
          </Route>
          
          {/* Catch-all 404 Route */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Container>
    </>
  );
}

export default App;