// client/src/components/student/ContestHistory.js
import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  ToggleButtonGroup,
  ToggleButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Link as MuiLink,
  Tooltip,
  CircularProgress
} from '@mui/material';
import { subDays, fromUnixTime, format as formatDate } from 'date-fns';
import RatingGraph from './RatingGraph';

const ContestHistory = ({ contests, studentOverallSyncStatus }) => {
  const [timeFilter, setTimeFilter] = useState('all');

  const handleTimeFilterChange = (event, newFilter) => {
    if (newFilter !== null) {
      setTimeFilter(newFilter);
    }
  };

  const filteredContests = useMemo(() => {
    if (!contests || contests.length === 0) {
      return [];
    }
    const now = new Date();
    let startDate;
    // Default to all, sort by most recent
    let anArrayOfContests = [...contests].sort((a, b) => b.ratingUpdatedAtSeconds - a.ratingUpdatedAtSeconds);

    switch (timeFilter) {
      case '30d':
        startDate = subDays(now, 30);
        return anArrayOfContests.filter(contest => fromUnixTime(contest.ratingUpdatedAtSeconds) >= startDate);
      case '90d':
        startDate = subDays(now, 90);
        return anArrayOfContests.filter(contest => fromUnixTime(contest.ratingUpdatedAtSeconds) >= startDate);
      case '365d':
        startDate = subDays(now, 365);
        return anArrayOfContests.filter(contest => fromUnixTime(contest.ratingUpdatedAtSeconds) >= startDate);
      case 'all':
      default:
        return anArrayOfContests; // Already sorted
    }
  }, [contests, timeFilter]);

  const ratingHistoryDataForGraph = useMemo(() => {
    if (!filteredContests || filteredContests.length === 0) return [];
    return [...filteredContests].reverse().map(contest => ({ // Reverse for chronological order for graph
        time: contest.ratingUpdatedAtSeconds * 1000,
        rating: contest.newRating,
        name: contest.contestName,
    }));
  }, [filteredContests]);

  const isLoadingContestList = studentOverallSyncStatus === 'pending' && (!contests || contests.length === 0);

  return (
    <Paper elevation={2} sx={{ p: { xs: 1, sm: 2 }, mt: 3 }}>
      <Typography variant="h5" gutterBottom component="h2">
        Contest History
      </Typography>

      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 1 }}>
        <ToggleButtonGroup
          value={timeFilter}
          exclusive
          onChange={handleTimeFilterChange}
          aria-label="time filter"
          size="small"
        >
          <ToggleButton value="30d" aria-label="last 30 days">Last 30 Days</ToggleButton>
          <ToggleButton value="90d" aria-label="last 90 days">Last 90 Days</ToggleButton>
          <ToggleButton value="365d" aria-label="last 365 days">Last 365 Days</ToggleButton>
          <ToggleButton value="all" aria-label="all time">All Time</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <Box sx={{ mb: 3, width: '100%', minHeight: 300, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        {isLoadingContestList ? (
          <>
            <CircularProgress size={30} sx={{mr:1}}/> 
            <Typography color="text.secondary">Loading rating graph data...</Typography>
          </>
        ) : ratingHistoryDataForGraph.length > 0 ? (
          <RatingGraph data={ratingHistoryDataForGraph} />
        ) : (
          <Typography color="text.secondary">No rating data available for the selected period.</Typography>
        )}
      </Box>

      <Typography variant="h6" gutterBottom component="h3" sx={{mt: 2}}>
        Contest Details ({isLoadingContestList ? 'loading...' : filteredContests.length})
      </Typography>

      {isLoadingContestList ? (
        <Box sx={{display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100px'}}>
            <CircularProgress size={30} sx={{mr:1}} /> <Typography color="text.secondary">Loading contest list...</Typography>
        </Box>
      ) : filteredContests.length > 0 ? (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small" aria-label="contest history table">
            <TableHead sx={{ backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'grey.700' : 'grey.100' }}>
              <TableRow>
                <TableCell sx={{ width: '15%', py: 1 }}>Date</TableCell>
                <TableCell sx={{ width: '30%', py: 1 }}>Contest Name</TableCell>
                <TableCell align="right" sx={{ width: '10%', py: 1 }}>Rank</TableCell>
                <TableCell align="center" sx={{ width: '15%', whiteSpace: 'nowrap', py: 1 }}>Problems Solved</TableCell>
                <TableCell align="right" sx={{ width: '10%', py: 1 }}>Old Rating</TableCell>
                <TableCell align="right" sx={{ width: '10%', py: 1 }}>New Rating</TableCell>
                <TableCell align="right" sx={{ width: '10%', py: 1 }}>Change</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredContests.map((contest) => {
                const isDetailsSynced = contest.contestDetailsSynced === true;
                
                let displayValue = "-/-";
                let tooltipTitle = "Problem count data unavailable or not yet synced.";

                if (isDetailsSynced) {
                  const solved = contest.problemsSolvedByUser !== undefined ? contest.problemsSolvedByUser : 0;
                  const total = contest.totalProblemsInContest !== undefined && contest.totalProblemsInContest > 0 
                                ? contest.totalProblemsInContest 
                                : 0;
                  
                  displayValue = `${solved}/${total || '-'}`;
                  if (total > 0) {
                     tooltipTitle = `${total - solved} unsolved`;
                  } else if (total === 0 && solved === 0 && isDetailsSynced) {
                     tooltipTitle = "No problems listed for this contest or data issue.";
                  } else {
                     tooltipTitle = "Problem count data appears incomplete.";
                  }
                }

                return (
                  <TableRow key={contest.contestId + '-' + contest.ratingUpdatedAtSeconds} sx={{ '&:hover': { backgroundColor: 'action.hover' }}}>
                    <TableCell sx={{py: 0.5}}>{formatDate(fromUnixTime(contest.ratingUpdatedAtSeconds), 'MMM d, yyyy')}</TableCell>
                    <TableCell sx={{py: 0.5}}>
                      <MuiLink
                          href={`https://codeforces.com/contest/${contest.contestId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          underline="hover"
                      >
                          {contest.contestName}
                      </MuiLink>
                    </TableCell>
                    <TableCell align="right" sx={{py: 0.5}}>{contest.rank}</TableCell>
                    <TableCell align="center" sx={{py: 0.5}}>
                      {!isDetailsSynced && studentOverallSyncStatus === 'pending' ? (
                        <Tooltip title="Syncing problem counts..." placement="top">
                           <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center' }}>
                                <CircularProgress size={16} sx={{ verticalAlign: 'middle' }} />
                           </Box>
                        </Tooltip>
                      ) : !isDetailsSynced ? (
                        <Tooltip title="Problem counts not yet synced." placement="top">
                           <span>-/-</span>
                        </Tooltip>
                      ) : (
                        <Tooltip title={tooltipTitle} placement="top">
                          <span>{displayValue}</span>
                        </Tooltip>
                      )}
                    </TableCell>
                    <TableCell align="right" sx={{py: 0.5}}>{contest.oldRating}</TableCell>
                    <TableCell align="right" sx={{py: 0.5}}>{contest.newRating}</TableCell>
                    <TableCell
                      align="right"
                      sx={{
                        py: 0.5,
                        color: contest.newRating - contest.oldRating >= 0
                          ? (contest.newRating - contest.oldRating > 0 ? 'success.main' : 'text.primary')
                          : 'error.main',
                        fontWeight: contest.newRating - contest.oldRating !== 0 ? 'bold' : 'normal'
                      }}
                    >
                      {contest.newRating - contest.oldRating >= 0 ? '+' : ''}
                      {contest.newRating - contest.oldRating}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <Typography sx={{mt: 2, textAlign: 'center'}} color="text.secondary">
          No contests found for the selected period.
        </Typography>
      )}
    </Paper>
  );
};

export default ContestHistory;