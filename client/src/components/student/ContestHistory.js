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
  Tooltip // <-- IMPORT Tooltip
} from '@mui/material';
import { subDays, fromUnixTime, format as formatDate } from 'date-fns';

import RatingGraph from './RatingGraph';

const ContestHistory = ({ contests }) => {
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
    switch (timeFilter) {
      case '30d': startDate = subDays(now, 30); break;
      case '90d': startDate = subDays(now, 90); break;
      case '365d': startDate = subDays(now, 365); break;
      default: /* 'all' */
        return [...contests].sort((a, b) => b.ratingUpdatedAtSeconds - a.ratingUpdatedAtSeconds);
    }
    return contests
      .filter(contest => fromUnixTime(contest.ratingUpdatedAtSeconds) >= startDate)
      .sort((a, b) => b.ratingUpdatedAtSeconds - a.ratingUpdatedAtSeconds);
  }, [contests, timeFilter]);

  const ratingHistoryDataForGraph = useMemo(() => {
    if (!filteredContests || filteredContests.length === 0) return [];
    return [...filteredContests].reverse().map(contest => ({
        time: contest.ratingUpdatedAtSeconds * 1000,
        rating: contest.newRating,
        name: contest.contestName,
    }));
  }, [filteredContests]);

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

      <Box sx={{ mb: 3, width: '100%', minHeight: 300 }}>
        <RatingGraph data={ratingHistoryDataForGraph} />
      </Box>

      <Typography variant="h6" gutterBottom component="h3" sx={{mt: 2}}>
        Contest Details ({filteredContests.length})
      </Typography>
      {filteredContests.length > 0 ? (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small" aria-label="contest history table">
            <TableHead sx={{ backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'grey.700' : 'grey.100' }}>
              <TableRow>
                <TableCell sx={{ width: '15%' }}>Date</TableCell>
                <TableCell sx={{ width: '30%' }}>Contest Name</TableCell> {/* Adjusted width */}
                <TableCell align="right" sx={{ width: '10%' }}>Rank</TableCell>
                {/* --- NEW COLUMN HEADER --- */}
                <TableCell align="center" sx={{ width: '15%', whiteSpace: 'nowrap' }}>Problems Solved</TableCell>
                <TableCell align="right" sx={{ width: '10%' }}>Old Rating</TableCell>
                <TableCell align="right" sx={{ width: '10%' }}>New Rating</TableCell>
                <TableCell align="right" sx={{ width: '10%' }}>Change</TableCell> {/* Adjusted width */}
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredContests.map((contest) => {
                // Gracefully handle potentially missing problem count data
                const solved = contest.problemsSolvedByUser !== undefined ? contest.problemsSolvedByUser : '-';
                const total = contest.totalProblemsInContest !== undefined && contest.totalProblemsInContest > 0 
                              ? contest.totalProblemsInContest 
                              : (solved !== '-' ? '-' : ''); // If solved is a number but total is 0/undefined, show '-' for total. If solved is '-', total can be empty.
                
                let unsolvedText = "Problem count data unavailable";
                if (typeof solved === 'number' && typeof total === 'number' && total > 0) {
                  unsolvedText = `${total - solved} unsolved`;
                } else if (solved !== '-' && total === '-') {
                   // If we know solved but not total (less likely with new backend logic but defensive)
                   unsolvedText = "Total problems unknown";
                }


                return (
                  <TableRow key={contest.contestId + '-' + contest.ratingUpdatedAtSeconds} sx={{ '&:hover': { backgroundColor: 'action.hover' }}}>
                    <TableCell>
                      {formatDate(fromUnixTime(contest.ratingUpdatedAtSeconds), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      <MuiLink
                          href={`https://codeforces.com/contest/${contest.contestId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          underline="hover"
                      >
                          {contest.contestName}
                      </MuiLink>
                    </TableCell>
                    <TableCell align="right">{contest.rank}</TableCell>
                    {/* --- NEW CELL FOR DISPLAYING SOLVED/TOTAL --- */}
                    <TableCell align="center">
                      <Tooltip title={unsolvedText} placement="top">
                        <span> {/* Tooltip needs a child that can accept ref, span works */}
                          {`${solved}${total !== '' ? '/' + total : ''}`}
                        </span>
                      </Tooltip>
                    </TableCell>
                    <TableCell align="right">{contest.oldRating}</TableCell>
                    <TableCell align="right">{contest.newRating}</TableCell>
                    <TableCell
                      align="right"
                      sx={{
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