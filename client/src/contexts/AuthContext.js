// client/src/contexts/AuthContext.js
import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { registerUserAPI, loginUserAPI, getMeAPI, logoutUserAPI } from '../services/api';

// Initial state
const initialState = {
  isAuthenticated: false,
  user: null, // { _id, username, email, role }
  token: localStorage.getItem('token') || null,
  isLoading: true, // Initially true to check for existing session
  error: null,
};

// Action types
const LOGIN_SUCCESS = 'LOGIN_SUCCESS';
const LOGIN_FAIL = 'LOGIN_FAIL';
const REGISTER_SUCCESS = 'REGISTER_SUCCESS'; // Might not change auth state directly
const REGISTER_FAIL = 'REGISTER_FAIL';
const USER_LOADED = 'USER_LOADED';
const AUTH_ERROR = 'AUTH_ERROR'; // For when getMeAPI fails after login
const LOGOUT = 'LOGOUT';
const SET_LOADING = 'SET_LOADING';
const CLEAR_ERRORS = 'CLEAR_ERRORS';

// Reducer
const authReducer = (state, action) => {
  switch (action.type) {
    case SET_LOADING:
      return { ...state, isLoading: true };
    case USER_LOADED:
      return {
        ...state,
        isAuthenticated: true,
        isLoading: false,
        user: action.payload,
        error: null,
      };
    case LOGIN_SUCCESS:
      localStorage.setItem('token', action.payload.token);
      return {
        ...state,
        ...action.payload, // { token, user }
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };
    case REGISTER_SUCCESS: // Registration might not auto-login, just clear errors
      return {
        ...state,
        isLoading: false,
        error: null,
        // If auto-login on register, it would be similar to LOGIN_SUCCESS
      };
    case AUTH_ERROR:
    case LOGIN_FAIL:
    case REGISTER_FAIL:
    case LOGOUT:
      localStorage.removeItem('token');
      return {
        ...state,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        user: null,
        error: action.payload || null, // action.payload might contain error message
      };
    case CLEAR_ERRORS:
      return {
        ...state,
        error: null,
      };
    default:
      return state;
  }
};

// Create Context
export const AuthContext = createContext(initialState);

// Provider Component
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Attempt to load user from token on initial app load
  useEffect(() => {
    const loadUserFromToken = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        // No need to set apiClient header here, interceptor in api.js handles it
        try {
          dispatch({ type: SET_LOADING });
          const user = await getMeAPI(); // getMeAPI uses token from localStorage via interceptor
          if (user) {
            dispatch({ type: USER_LOADED, payload: user });
          } else {
            // Token might be invalid or expired, getMeAPI returns null or throws
            dispatch({ type: AUTH_ERROR, payload: 'Session expired or token invalid.' });
          }
        } catch (error) {
          // Error from getMeAPI (e.g., network error, or specific error if not 401)
          dispatch({ type: AUTH_ERROR, payload: error.message || 'Failed to load user session.' });
        }
      } else {
        dispatch({ type: AUTH_ERROR }); // No token, so not authenticated
      }
    };
    loadUserFromToken();
  }, []); // Runs once on mount

  // Actions
  const login = async (credentials) => { // { loginIdentifier, password }
    dispatch({ type: SET_LOADING });
    try {
      const data = await loginUserAPI(credentials); // api.js now handles localStorage.setItem
      if (data.success && data.user && data.token) {
        dispatch({
          type: LOGIN_SUCCESS,
          payload: { user: data.user, token: data.token },
        });
        return data; // Return full response for potential further handling
      } else {
        // Should be caught by catch block if api.js throws properly
        dispatch({ type: LOGIN_FAIL, payload: data.message || 'Login failed' });
        throw data; // Re-throw for form to handle
      }
    } catch (error) {
      dispatch({ type: LOGIN_FAIL, payload: error.message || 'Login attempt failed' });
      throw error; // Re-throw for form error handling
    }
  };

  const register = async (userData) => { // { username, email, password, role? }
    dispatch({ type: SET_LOADING });
    try {
      const data = await registerUserAPI(userData);
      if (data.success) {
        dispatch({ type: REGISTER_SUCCESS });
        // Decide if you want to auto-login:
        // If so, call login() or dispatch LOGIN_SUCCESS with token/user if backend returns them
        // For now, registration is separate from login.
        return data; // Return { success, message }
      } else {
        dispatch({ type: REGISTER_FAIL, payload: data.message || 'Registration failed' });
        throw data;
      }
    } catch (error) {
      dispatch({ type: REGISTER_FAIL, payload: error.message || 'Registration attempt failed' });
      throw error;
    }
  };

  const logout = async () => {
    try {
      await logoutUserAPI(); // Backend clears httpOnly cookie if any
    } catch (error) {
      console.error("Logout API call failed, proceeding with client-side logout:", error);
    } finally {
      // Always perform client-side logout actions
      dispatch({ type: LOGOUT });
    }
  };

  const clearErrors = () => dispatch({ type: CLEAR_ERRORS });


  return (
    <AuthContext.Provider
      value={{
        ...state, // isAuthenticated, user, token, isLoading, error
        login,
        register,
        logout,
        clearErrors,
        // loadUser: loadUserFromToken, // Expose if manual reload is needed from UI
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use AuthContext
export const useAuth = () => {
  return useContext(AuthContext);
};