// client/src/components/common/Navbar.js
import React from 'react';
import { AppBar, Toolbar, Typography, IconButton, Box, Button, Avatar, Menu, MenuItem, Tooltip } from '@mui/material';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import SettingsIcon from '@mui/icons-material/Settings';
import HomeIcon from '@mui/icons-material/Home';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import ExitToAppIcon from '@mui/icons-material/ExitToApp'; // Logout Icon
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useCustomTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';

const Navbar = () => {
  const { mode, toggleThemeMode } = useCustomTheme();
  const { isAuthenticated, user, logout, isLoading } = useAuth();
  const navigate = useNavigate();

  const [anchorElUser, setAnchorElUser] = React.useState(null);

  const handleOpenUserMenu = (event) => {
    setAnchorElUser(event.currentTarget);
  };

  const handleCloseUserMenu = () => {
    setAnchorElUser(null);
  };

  const handleDirectLogout = async () => { // For the direct button
    await logout();
    navigate('/login');
  };

  const handleMenuLogout = async () => { // For the menu item
    handleCloseUserMenu();
    await logout();
    navigate('/login');
  };

  return (
    <AppBar position="static">
      <Toolbar>
        <Typography
          variant="h6"
          component={RouterLink}
          to="/"
          sx={{ flexGrow: 1, color: 'inherit', textDecoration: 'none' }}
        >
          Student Progress Manager
        </Typography>

        <Button color="inherit" component={RouterLink} to="/" startIcon={<HomeIcon />}>
          Students
        </Button>

        {isAuthenticated && user?.role === 'admin' && (
          <Button color="inherit" component={RouterLink} to="/admin/settings" startIcon={<SettingsIcon />}>
            Admin
          </Button>
        )}

        <Tooltip title="Toggle light/dark theme">
          <IconButton sx={{ ml: 1 }} onClick={toggleThemeMode} color="inherit" aria-label="toggle theme mode">
            {mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
          </IconButton>
        </Tooltip>

        {isLoading ? (
          <Button color="inherit" disabled>Loading...</Button>
        ) : isAuthenticated && user ? (
          <> {/* Use Fragment to group Avatar menu and Logout button */}
            <Box sx={{ flexGrow: 0, ml: 2 }}> {/* User Avatar and Menu */}
              <Tooltip title="User Account">
                <IconButton onClick={handleOpenUserMenu} sx={{ p: 0 }}>
                  <Avatar alt={user.username?.toUpperCase()} sx={{ bgcolor: 'secondary.main' }}>
                    {user.username ? user.username.charAt(0).toUpperCase() : <AccountCircleIcon />}
                  </Avatar>
                </IconButton>
              </Tooltip>
              <Menu
                sx={{ mt: '45px' }}
                id="menu-appbar"
                anchorEl={anchorElUser}
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                keepMounted
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                open={Boolean(anchorElUser)}
                onClose={handleCloseUserMenu}
              >
                <MenuItem disabled>
                  <Typography textAlign="center" variant="subtitle2">{user.username} ({user.role})</Typography>
                </MenuItem>
                <MenuItem onClick={handleMenuLogout}>
                  <ExitToAppIcon sx={{ mr: 1, fontSize: '1.2rem' }} />
                  <Typography textAlign="center">Logout</Typography>
                </MenuItem>
              </Menu>
            </Box>
            
          </>
        ) : (
          <>
            <Button color="inherit" component={RouterLink} to="/login">Login</Button>
            <Button color="inherit" component={RouterLink} to="/register">Register</Button>
          </>
        )}
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;