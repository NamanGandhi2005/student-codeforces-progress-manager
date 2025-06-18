// client/src/contexts/ThemeContext.js
import React, { createContext, useState, useMemo, useContext, useEffect } from 'react';
import { ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

export const CustomThemeContext = createContext({
  toggleThemeMode: () => {},
  mode: 'light',
});

export const CustomThemeProvider = ({ children }) => {
  const [mode, setMode] = useState(() => {
    // Get initial mode from localStorage or default to 'light'
    const savedMode = localStorage.getItem('themeMode');
    return savedMode || 'light';
  });

  useEffect(() => {
    // Save mode to localStorage whenever it changes
    localStorage.setItem('themeMode', mode);
  }, [mode]);

  const colorMode = useMemo(
    () => ({
      toggleThemeMode: () => {
        setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
      },
      mode,
    }),
    [mode]
  );

  const muiTheme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          // Example: Define specific colors for light and dark modes if needed
          // primary: {
          //   main: mode === 'light' ? '#1976d2' : '#90caf9',
          // },
          // background: {
          //   default: mode === 'light' ? '#f5f5f5' : '#121212',
          //   paper: mode === 'light' ? '#ffffff' : '#1e1e1e',
          // }
        },
        // You can add more theme customizations here (typography, components, etc.)
      }),
    [mode]
  );

  return (
    <CustomThemeContext.Provider value={colorMode}>
      <MuiThemeProvider theme={muiTheme}>
        <CssBaseline /> {/* Applies baseline styling and dark mode background */}
        {children}
      </MuiThemeProvider>
    </CustomThemeContext.Provider>
  );
};

export const useCustomTheme = () => useContext(CustomThemeContext);