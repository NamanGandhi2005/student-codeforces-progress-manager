// client/src/services/api.js
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// --- Axios Request Interceptor to Add JWT Token ---
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// --- Student API Calls ---
export const getAllStudents = async () => {
  try {
    const response = await apiClient.get('/students');
    // Assuming backend returns { success: true, count: X, data: [...] }
    if (response.data && response.data.success && Array.isArray(response.data.data)) {
        return response.data.data;
    }
    console.error('getAllStudents: Unexpected response structure:', response.data);
    throw new Error('Failed to parse student list from server response.');
  } catch (error) {
    const errorMsg = error.response?.data?.message || error.message || 'Failed to fetch students';
    console.error('Error fetching all students:', errorMsg);
    throw error.response?.data || new Error(errorMsg);
  }
};

export const getStudentById = async (studentId) => {
  try {
    const response = await apiClient.get(`/students/${studentId}`);
    // Assuming backend returns { success: true, data: studentObject }
    if (response.data && response.data.success && response.data.data) {
        return response.data.data;
    }
    console.error(`getStudentById (${studentId}): Unexpected response structure:`, response.data);
    throw new Error('Failed to parse student data from server response.');
  } catch (error) {
    const errorMsg = error.response?.data?.message || error.message || `Failed to fetch student ${studentId}`;
    console.error(`Error fetching student ${studentId}:`, errorMsg);
    throw error.response?.data || new Error(errorMsg);
  }
};

export const addStudent = async (studentData) => {
  try {
    const response = await apiClient.post('/students', studentData);
    // Assuming backend returns { success: true, data: newStudentObject, message: "..." }
    if (response.data && response.data.success && response.data.data) {
        return response.data.data; // Return the new student object
    }
    console.error('addStudent: Unexpected response structure or failed:', response.data);
    throw new Error(response.data?.message || 'Failed to add student due to server response.');
  } catch (error) {
    const errorMsg = error.response?.data?.message || error.message || 'Failed to add student';
    console.error('Error adding student:', errorMsg);
    throw error.response?.data || new Error(errorMsg);
  }
};

export const updateStudent = async (studentId, updatedData) => {
  try {
    const response = await apiClient.put(`/students/${studentId}`, updatedData);
    // Assuming backend returns { success: true, data: updatedStudentObject, message: "..." }
     if (response.data && response.data.success && response.data.data) {
        return response.data.data; // Return the updated student object
    }
    console.error(`updateStudent (${studentId}): Unexpected response structure or failed:`, response.data);
    throw new Error(response.data?.message || 'Failed to update student due to server response.');
  } catch (error) {
    const errorMsg = error.response?.data?.message || error.message || `Failed to update student ${studentId}`;
    console.error(`Error updating student ${studentId}:`, errorMsg);
    throw error.response?.data || new Error(errorMsg);
  }
};

export const deleteStudent = async (studentId) => {
  try {
    const response = await apiClient.delete(`/students/${studentId}`);
    // Assuming backend returns { success: true, message: "..." }
    if (response.data && response.data.success) {
        return response.data;
    }
    console.error(`deleteStudent (${studentId}): Delete was not successful or unexpected response:`, response.data);
    throw new Error(response.data?.message || `Failed to delete student ${studentId} due to server response.`);
  } catch (error) {
    const errorMsg = error.response?.data?.message || error.message || `Failed to delete student ${studentId}`;
    console.error(`Error deleting student ${studentId}:`, errorMsg);
    throw error.response?.data || new Error(errorMsg);
  }
};

export const downloadStudentsCSV = async () => {
    try {
        const response = await apiClient.get('/students/csv', { responseType: 'blob' });
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        const contentDisposition = response.headers['content-disposition'];
        let fileName = 'students_data.csv';
        if (contentDisposition) {
            const fileNameMatch = contentDisposition.match(/filename="?(.+)"?/i);
            if (fileNameMatch && fileNameMatch.length === 2) fileName = fileNameMatch[1];
        }
        link.setAttribute('download', fileName);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        // No explicit return needed as it's a side-effect (download)
    } catch (error) {
        // Try to parse error from blob if it's a JSON error response
        let errorMsg = 'Failed to download CSV';
        if (error.response && error.response.data instanceof Blob && error.response.data.type === "application/json") {
            try {
                const errJson = JSON.parse(await error.response.data.text());
                errorMsg = errJson.message || errorMsg;
            } catch (e) { /* ignore parsing error, use default */ }
        } else {
            errorMsg = error.response?.data?.message || error.message || errorMsg;
        }
        console.error('Error downloading students CSV:', errorMsg);
        throw new Error(errorMsg); // Throw a single Error object
    }
};

// --- Admin API Calls ---
export const getCronSettings = async () => {
  try {
    const response = await apiClient.get('/admin/cron-settings');
    console.log("API Response from GET /admin/cron-settings:", response.data);
    if (response.data && response.data.success && response.data.data) {
      return response.data.data;
    } else {
      console.error('getCronSettings: Unexpected response structure:', response.data);
      throw new Error('Failed to parse cron settings from server response.');
    }
  } catch (error) {
    const errorMsg = error.response?.data?.message || error.message || 'Failed to fetch cron settings';
    console.error('Error in getCronSettings API call:', errorMsg);
    throw error.response?.data || new Error(errorMsg);
  }
};

export const updateCronSettings = async (settingsData) => {
  try {
    const response = await apiClient.put('/admin/cron-settings', settingsData);
    console.log("API Response from PUT /admin/cron-settings:", response.data);
    if (response.data && response.data.success) {
        return response.data; // Return { success, message, data (updatedSettings)}
    } else {
        console.error('updateCronSettings: Update was not successful or unexpected response:', response.data);
        throw new Error(response.data?.message || 'Failed to update cron settings on the server.');
    }
  } catch (error) {
    const errorMsg = error.response?.data?.message || error.message || 'Failed to update cron settings';
    console.error('Error in updateCronSettings API call:', errorMsg);
    throw error.response?.data || new Error(errorMsg);
  }
};


// --- Authentication API Calls ---
export const registerUserAPI = async (userData) => {
  try {
    const response = await apiClient.post('/auth/register', userData);
    return response.data;
  } catch (error) {
    console.error('API Error - Register User:', error.response?.data || error.message);
    throw error.response?.data || { success: false, message: error.message || 'Registration failed' };
  }
};

export const loginUserAPI = async (credentials) => {
  try {
    const response = await apiClient.post('/auth/login', credentials);
    if (response.data.success && response.data.token && response.data.user) {
        localStorage.setItem('token', response.data.token);
    }
    return response.data;
  } catch (error) {
    console.error('API Error - Login User:', error.response?.data || error.message);
    throw error.response?.data || { success: false, message: error.message || 'Login failed' };
  }
};

export const getMeAPI = async () => {
  try {
    const response = await apiClient.get('/auth/me');
    return response.data.data;
  } catch (error) {
    console.error('API Error - Get Me:', error.response?.data || error.message);
    if (error.response?.status === 401) {
        localStorage.removeItem('token');
        return null;
    }
    throw error.response?.data || { success: false, message: error.message || 'Failed to fetch user' };
  }
};

export const logoutUserAPI = async () => {
    try {
        const response = await apiClient.get('/auth/logout');
        localStorage.removeItem('token');
        return response.data;
    } catch (error) {
        console.error('API Error - Logout User:', error.response?.data || error.message);
        localStorage.removeItem('token');
        throw error.response?.data || { success: false, message: error.message || 'Logout failed' };
    }
};

export default  apiClient;