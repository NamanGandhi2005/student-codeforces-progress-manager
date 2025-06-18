// client/src/pages/LoginPage.js
import React, { useState, useContext, useEffect } from 'react'; // Added useEffect
import { useNavigate, Link as RouterLink, useLocation } from 'react-router-dom'; // <-- ADDED useLocation
import { AuthContext, useAuth } from '../contexts/AuthContext'; // Or import useAuth, using useAuth() is cleaner
import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  CircularProgress,
  Alert,
  Paper,
  Link as MuiLink,
  Grid
} from '@mui/material';

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation(); // <-- GET THE LOCATION OBJECT
  // Using useAuth() custom hook is slightly cleaner than useContext(AuthContext) directly
  const { login, isLoading, error, clearErrors, isAuthenticated } = useAuth(); 

  const [formData, setFormData] = useState({
    loginIdentifier: '',
    password: '',
  });
  const [formErrors, setFormErrors] = useState({});

  // Determine where to redirect after login; default to home page "/"
  const from = location.state?.from?.pathname || "/"; // <-- GET 'from' PATH

  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true }); // <-- REDIRECT TO 'from' LOCATION
    }
    // Clear any global auth errors when component mounts or when 'from' changes,
    // but only if not already authenticated (to avoid clearing an error just before redirect)
    if (!isAuthenticated && error) {
        clearErrors();
    }
  }, [isAuthenticated, navigate, from, error, clearErrors]); // Added 'from' to dependency array


  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (formErrors[e.target.name]) {
        setFormErrors(prev => ({...prev, [e.target.name]: null}));
    }
    if (error) clearErrors();
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.loginIdentifier.trim()) newErrors.loginIdentifier = 'Username or Email is required';
    if (!formData.password) newErrors.password = 'Password is required';
    setFormErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      await login({ 
        loginIdentifier: formData.loginIdentifier, 
        password: formData.password 
      });
      // Successful login will set isAuthenticated to true,
      // and the useEffect above will handle the navigation.
    } catch (err) {
      // Error is already set in AuthContext by the login function
      // and will be displayed by the Alert component.
      console.error("Login page submit error caught by component:", err);
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Paper elevation={3} sx={{ marginTop: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 4 }}>
        <Typography component="h1" variant="h5">
          Sign In
        </Typography>
        {/* Display global auth error if present */}
        {error && !isLoading && <Alert severity="error" sx={{ width: '100%', mt: 2, mb: 1 }}>{error}</Alert>}
        <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1, width: '100%' }}>
          <TextField
            margin="normal"
            required
            fullWidth
            id="loginIdentifier"
            label="Username or Email Address"
            name="loginIdentifier"
            autoComplete="email username"
            autoFocus
            value={formData.loginIdentifier}
            onChange={handleChange}
            error={!!formErrors.loginIdentifier}
            helperText={formErrors.loginIdentifier}
            disabled={isLoading}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            name="password"
            label="Password"
            type="password"
            id="password"
            autoComplete="current-password"
            value={formData.password}
            onChange={handleChange}
            error={!!formErrors.password}
            helperText={formErrors.password}
            disabled={isLoading}
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2, position: 'relative' }}
            disabled={isLoading}
          >
            {isLoading ? <CircularProgress size={24} color="inherit" sx={{position: 'absolute'}} /> : 'Sign In'}
          </Button>
          <Grid container justifyContent="flex-end">
            <Grid item>
              <MuiLink component={RouterLink} to="/register" variant="body2">
                {"Don't have an account? Sign Up"}
              </MuiLink>
            </Grid>
          </Grid>
        </Box>
      </Paper>
    </Container>
  );
};

export default LoginPage;