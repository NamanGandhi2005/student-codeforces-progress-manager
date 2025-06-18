// client/src/components/student/ProblemSolvingData.js
import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  ToggleButtonGroup,
  ToggleButton,
  Grid,
  Card,
  CardContent,
  Alert, // Make sure Alert is imported
  Link as MuiLink,
  Divider
} from '@mui/material';
import { subDays, fromUnixTime, differenceInDays, formatDistanceStrict, startOfDay, endOfDay } from 'date-fns';

import ProblemRatingBarChart from './ProblemRatingBarChart';
import SubmissionHeatmap from './SubmissionHeatmap';
// --- UNCOMMENT AND USE THE ACTUAL TAGS CHART COMPONENT ---
import ProblemTagsChart from './ProblemTagsChart'; 


const ProblemSolvingData = ({ submissions }) => {
  const [timeFilter, setTimeFilter] = useState('all'); 

  const handleTimeFilterChange = (event, newFilter) => {
    if (newFilter !== null) {
      setTimeFilter(newFilter);
    }
  };

  const filteredSubmissions = useMemo(() => {
    if (!submissions || submissions.length === 0) return { list: [], days: 0, periodDescription: 'selected period' };
    const now = new Date();
    let startDate, daysInPeriod, periodDescription, listToFilter = submissions;
    switch (timeFilter) {
      case '7d': startDate = subDays(now, 7); daysInPeriod = 7; periodDescription = 'last 7 days'; listToFilter = submissions.filter(sub => fromUnixTime(sub.creationTimeSeconds) >= startDate); break;
      case '30d': startDate = subDays(now, 30); daysInPeriod = 30; periodDescription = 'last 30 days'; listToFilter = submissions.filter(sub => fromUnixTime(sub.creationTimeSeconds) >= startDate); break;
      case '90d': startDate = subDays(now, 90); daysInPeriod = 90; periodDescription = 'last 90 days'; listToFilter = submissions.filter(sub => fromUnixTime(sub.creationTimeSeconds) >= startDate); break;
      default: /* 'all' */
        const sortedSubmissions = [...submissions].sort((a,b) => a.creationTimeSeconds - b.creationTimeSeconds);
        if (sortedSubmissions.length === 0) return { list: [], days: 0, periodDescription: 'all time (no activity)' };
        const firstSubDate = fromUnixTime(sortedSubmissions[0].creationTimeSeconds);
        const lastSubDateForPeriodCalc = endOfDay(new Date());
        daysInPeriod = differenceInDays(lastSubDateForPeriodCalc, startOfDay(firstSubDate)) + 1; 
        if (daysInPeriod <= 0) daysInPeriod = 1;
        periodDescription = `all time (${formatDistanceStrict(firstSubDate, lastSubDateForPeriodCalc, { addSuffix: false })})`;
        break;
    }
    return { list: listToFilter, days: daysInPeriod, periodDescription };
  }, [submissions, timeFilter]);


  const solvedProblemsStats = useMemo(() => {
    const initialStats = { totalSolved: 0, mostDifficult: null, averageRating: 0, averagePerDay: "0.00", solvedProblemDetails: [], tagCounts: {}, tagDataForChart: [], periodDescription: filteredSubmissions.periodDescription || 'selected period' };
    if (!filteredSubmissions.list || filteredSubmissions.list.length === 0) return initialStats;
    const solvedSet = new Set(); const solvedProblemDetails = []; let mostDifficultProblem = null; let totalRatingSum = 0; const tagCounts = {};
    filteredSubmissions.list.forEach(sub => {
      if (sub.verdict === 'OK') {
        const problemKey = `${sub.contestId || 'gym'}-${sub.problemIndex}`;
        if (!solvedSet.has(problemKey)) {
          solvedSet.add(problemKey);
          const currentProblemRating = sub.rating || 0; const currentProblemTags = sub.tags || [];
          solvedProblemDetails.push({ name: sub.problemName, rating: currentProblemRating, tags: currentProblemTags, contestId: sub.contestId, index: sub.problemIndex });
          if (Array.isArray(currentProblemTags)) { currentProblemTags.forEach(tag => { tagCounts[tag] = (tagCounts[tag] || 0) + 1; });}
          totalRatingSum += currentProblemRating;
          if (!mostDifficultProblem || currentProblemRating > (mostDifficultProblem.rating || 0)) { mostDifficultProblem = { name: sub.problemName, rating: currentProblemRating, contestId: sub.contestId, index: sub.problemIndex }; }
        }
      }
    });
    const totalSolved = solvedSet.size; const averageRating = totalSolved > 0 ? Math.round(totalRatingSum / totalSolved) : 0; const averagePerDay = filteredSubmissions.days > 0 ? (totalSolved / filteredSubmissions.days).toFixed(2) : "0.00";
    const tagDataForChart = Object.entries(tagCounts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    return { totalSolved, mostDifficult: mostDifficultProblem, averageRating, averagePerDay, solvedProblemDetails, tagCounts, tagDataForChart, periodDescription: filteredSubmissions.periodDescription };
  }, [filteredSubmissions]);

  // --- REMOVE ProblemTagsChartPlaceholder DEFINITION ---
  // const ProblemTagsChartPlaceholder = ({ data }) => ( ... );

  return (
    <Paper elevation={2} sx={{ p: { xs: 1, sm: 2 }, mt: 3 }}>
      <Box sx={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1, mb:0.5 }}>
        <Typography variant="h5" component="h2">Problem Solving Data</Typography>
        <ToggleButtonGroup value={timeFilter} exclusive onChange={handleTimeFilterChange} aria-label="problem time filter" size="small">
          <ToggleButton value="7d">7 Days</ToggleButton><ToggleButton value="30d">30 Days</ToggleButton>
          <ToggleButton value="90d">90 Days</ToggleButton><ToggleButton value="all">All Time</ToggleButton>
        </ToggleButtonGroup>
      </Box>
      <Typography variant="caption" color="text.secondary" sx={{display: 'block', textAlign: 'right', mb:1.5 }}>
          Stats for {solvedProblemsStats.periodDescription}
      </Typography>

      {/* --- RESTORED THIS ALERT --- */}
      {(!filteredSubmissions.list || filteredSubmissions.list.length === 0) && (
         <Alert severity="info" sx={{mt: 2}}>No submission data found for {solvedProblemsStats.periodDescription}.</Alert>
      )}

      {/* Conditionally render stats cards only if there is data */}
      {filteredSubmissions.list && filteredSubmissions.list.length > 0 && (
        <Grid container spacing={2} sx={{ mt: 0 }}>
           <Grid item xs={12} sm={6} md={3}><Card sx={{height: '100%'}}><CardContent><Typography color="text.secondary" gutterBottom>Total Solved (Unique)</Typography><Typography variant="h4">{solvedProblemsStats.totalSolved}</Typography></CardContent></Card></Grid>
          <Grid item xs={12} sm={6} md={3}><Card sx={{height: '100%'}}><CardContent><Typography color="text.secondary" gutterBottom>Most Difficult Solved</Typography><Typography variant="h4">{solvedProblemsStats.mostDifficult ? solvedProblemsStats.mostDifficult.rating : 'N/A'}</Typography>{solvedProblemsStats.mostDifficult && solvedProblemsStats.mostDifficult.contestId && solvedProblemsStats.mostDifficult.index && (<MuiLink href={`https://codeforces.com/contest/${solvedProblemsStats.mostDifficult.contestId}/problem/${solvedProblemsStats.mostDifficult.index}`} target="_blank" rel="noopener noreferrer" variant="caption" display="block" color="text.secondary" sx={{overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',textDecoration: 'underline','&:hover': { textDecoration: 'underline' }}}>{solvedProblemsStats.mostDifficult.name}</MuiLink>)}{solvedProblemsStats.mostDifficult && !(solvedProblemsStats.mostDifficult.contestId && solvedProblemsStats.mostDifficult.index) && (<Typography variant="caption" display="block" color="text.secondary" sx={{overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>{solvedProblemsStats.mostDifficult.name} (Link unavailable)</Typography>)}</CardContent></Card></Grid>
          <Grid item xs={12} sm={6} md={3}><Card sx={{height: '100%'}}><CardContent><Typography color="text.secondary" gutterBottom>Avg. Problem Rating</Typography><Typography variant="h4">{solvedProblemsStats.averageRating}</Typography></CardContent></Card></Grid>
          <Grid item xs={12} sm={6} md={3}><Card sx={{height: '100%'}}><CardContent><Typography color="text.secondary" gutterBottom>Avg. Solved / Day</Typography><Typography variant="h4">{solvedProblemsStats.averagePerDay}</Typography></CardContent></Card></Grid>
        </Grid>
      )}

      {/* Problem Rating Bar Chart */}
      {solvedProblemsStats.solvedProblemDetails && solvedProblemsStats.solvedProblemDetails.length > 0 && (
          <ProblemRatingBarChart solvedProblemDetails={solvedProblemsStats.solvedProblemDetails} />
      )}
      
      {/* --- USE THE ACTUAL TAGS CHART COMPONENT --- */}
      {solvedProblemsStats.tagDataForChart && solvedProblemsStats.tagDataForChart.length > 0 && (
        <>
          <Divider sx={{ my: 3 }} />
          <ProblemTagsChart tagData={solvedProblemsStats.tagDataForChart} />
        </>
      )}

      {/* Submission Heatmap */}
      {/* Conditionally render heatmap only if there are submissions (parent or filtered) */}
      {submissions && submissions.length > 0 && ( // Or use filteredSubmissions.list.length > 0 if heatmap should respect filters
          <SubmissionHeatmap submissions={submissions} />
      )}
    </Paper>
  );
};

export default ProblemSolvingData;