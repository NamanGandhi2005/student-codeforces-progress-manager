// client/src/index.js
import React from 'react';
import ReactDOM from 'react-dom/client';
// import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { CustomThemeProvider } from './contexts/ThemeContext';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext'; // <-- IMPORT AuthProvider

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <CustomThemeProvider> {/* Manages MUI theme and dark/light mode */}
      <AuthProvider>      {/* Manages global authentication state */}
        <BrowserRouter> {/* Provides routing capabilities */}
          <App />
        </BrowserRouter>
      </AuthProvider>
    </CustomThemeProvider>
  </React.StrictMode>
);

reportWebVitals();