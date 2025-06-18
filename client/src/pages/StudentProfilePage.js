// client/src/pages/StudentProfilePage.js
import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Grid,
  Divider,
  Button,
  Avatar,
  Chip
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { getStudentById } from '../services/api';
import { format } from 'date-fns';

// --- IMPORT ACTUAL COMPONENTS ---
import ContestHistory from '../components/student/ContestHistory';
import ProblemSolvingData from '../components/student/ProblemSolvingData'; // Import the new component

// Remove the inline ProblemSolvingDataSection placeholder definition
// const ProblemSolvingDataSection = ({ submissions }) => ( ... );


const StudentProfilePage = () => {
  const { studentId } = useParams();
  const navigate = useNavigate();

  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStudentData = useCallback(async () => {
    if (!studentId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getStudentById(studentId);
      setStudent(data);
    } catch (err) {
      setError(err.message || `Failed to fetch student profile for ID: ${studentId}`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    fetchStudentData();
  }, [fetchStudentData]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '70vh' }}>
        <CircularProgress /> <Typography sx={{ ml: 2 }}>Loading student profile...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Paper elevation={3} sx={{ p: 3, textAlign: 'center' }}>
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
        <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => navigate('/')}>
            Back to Student List
        </Button>
      </Paper>
    );
  }

  if (!student) {
    return (
      <Paper elevation={3} sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6">Student not found.</Typography>
        <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => navigate('/')} sx={{mt: 2}}>
            Back to Student List
        </Button>
      </Paper>
    );
  }

  return (
    <Paper elevation={3} sx={{ p: { xs: 2, md: 3 } }}>
      <Button
        variant="outlined"
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate('/')}
        sx={{ mb: 2 }}
      >
        Back to List
      </Button>

      <Grid container spacing={3} alignItems="center" sx={{ mb: 2 }}>
        <Grid item>
          <Avatar sx={{ bgcolor: 'primary.main', width: 64, height: 64, fontSize: '2rem' }}>
            {student.name ? student.name.charAt(0).toUpperCase() : '?'}
          </Avatar>
        </Grid>
        <Grid item xs>
          <Typography variant="h4" component="h1" gutterBottom>
            {student.name}
          </Typography>
          <Typography variant="subtitle1" color="text.secondary" gutterBottom>
            <a 
              href={`https://codeforces.com/profile/${student.codeforcesHandle}`} 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ color: 'inherit', textDecoration: 'none' }}
            >
              @{student.codeforcesHandle}
            </a>
          </Typography>
        </Grid>
      </Grid>

      <Grid container spacing={1} sx={{ mb:3 }}>
        <Grid item xs={12} sm={6} md={4}><Typography variant="body1"><strong>Email:</strong> {student.email}</Typography></Grid>
        <Grid item xs={12} sm={6} md={4}><Typography variant="body1"><strong>Phone:</strong> {student.phone || 'N/A'}</Typography></Grid>
        <Grid item xs={12} sm={6} md={4}><Typography variant="body1"><strong>Rating:</strong> {student.currentRating || 0} (Max: {student.maxRating || 0})</Typography></Grid>
        <Grid item xs={12} sm={6} md={4}><Typography variant="body1"><strong>Last Synced:</strong> {student.lastSyncedAt ? format(new Date(student.lastSyncedAt), 'PPpp') : 'Never'}</Typography></Grid>
        <Grid item xs={12} sm={6} md={4}><Typography variant="body1"><strong>Sync Status:</strong> <Chip label={student.syncStatus || 'N/A'} color={student.syncStatus === 'success' ? 'success' : (student.syncStatus === 'failed' ? 'error' : 'default')} size="small" /></Typography></Grid>
      </Grid>

      <Divider sx={{ my: 3 }} />

      <ContestHistory contests={student.codeforcesData?.contests || []} />

      {/* --- USE THE ACTUAL ProblemSolvingData COMPONENT --- */}
      <ProblemSolvingData submissions={student.codeforcesData?.submissions || []} />

    </Paper>
  );
};

export default StudentProfilePage;