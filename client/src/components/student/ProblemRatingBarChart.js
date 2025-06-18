// client/src/components/student/ProblemRatingBarChart.js
import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell // <--- Make sure Cell is imported
} from 'recharts';
import { useTheme } from '@mui/material/styles';
import { Box, Typography, Paper } from '@mui/material'; // Paper is needed for CustomTooltip

// Define a color mapping for rating buckets
const getRatingBucketColor = (bucketName, theme) => {
  // Adjust these colors to your preference or to match Codeforces rating colors
  // Using theme.palette for consistency
  if (bucketName.startsWith('0-') || bucketName.startsWith('800-')) return theme.palette.grey[500];        // Grey for 0-999
  if (bucketName.startsWith('1000-') || bucketName.startsWith('1200-')) return theme.palette.success.main; // Green for 1000-1399
  if (bucketName.startsWith('1400-')) return theme.palette.info.main;           // Cyan/Blue for 1400-1599
  if (bucketName.startsWith('1600-')) return theme.palette.secondary.light;      // Purple/Blue for 1600-1899
  if (bucketName.startsWith('1900-')) return theme.palette.warning.main;        // Orange for 1900-2099
  if (bucketName.startsWith('2100-')) return theme.palette.error.light;         // Red/Light Red for 2100-2399
  if (bucketName.startsWith('2400+')) return theme.palette.error.dark;          // Dark Red for 2400+
  if (bucketName === 'Unrated') return theme.palette.grey[700];
  return theme.palette.primary.main; // Default fallback color
};


const ProblemRatingBarChart = ({ solvedProblemDetails }) => {
  const theme = useTheme();

  const dataForBarChart = useMemo(() => {
    if (!solvedProblemDetails || solvedProblemDetails.length === 0) {
      return [];
    }
    const ratingBucketKeys = [
      '0-799', '800-999', '1000-1199', '1200-1399', '1400-1599',
      '1600-1899', '1900-2099', '2100-2399', '2400+', 'Unrated'
    ];
    const ratingBuckets = Object.fromEntries(ratingBucketKeys.map(key => [key, 0]));

    solvedProblemDetails.forEach(problem => {
      const rating = problem.rating;
      if (rating === undefined || rating === null || rating === 0) {
        ratingBuckets['Unrated']++;
      } else if (rating < 800) {
        ratingBuckets['0-799']++;
      } else if (rating <= 999) {
        ratingBuckets['800-999']++;
      } else if (rating <= 1199) {
        ratingBuckets['1000-1199']++;
      } else if (rating <= 1399) {
        ratingBuckets['1200-1399']++;
      } else if (rating <= 1599) {
        ratingBuckets['1400-1599']++;
      } else if (rating <= 1899) {
        ratingBuckets['1600-1899']++;
      } else if (rating <= 2099) {
        ratingBuckets['1900-2099']++;
      } else if (rating <= 2399) {
        ratingBuckets['2100-2399']++;
      } else {
        ratingBuckets['2400+']++;
      }
    });

    return Object.entries(ratingBuckets)
      .map(([name, count]) => ({ name, count }))
      .filter(bucket => bucket.count > 0);
  }, [solvedProblemDetails]);


  if (!dataForBarChart || dataForBarChart.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', p: 2, border: `1px dashed ${theme.palette.divider}`, mt: 3, minHeight: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography color="text.secondary">No rated problems solved in this period to display chart.</Typography>
      </Box>
    );
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <Paper elevation={3} sx={{ p: 1.5, backgroundColor: theme.palette.background.paper /* Use paper for tooltip background */ }}>
          <Typography variant="subtitle2" gutterBottom>{`Rating: ${label}`}</Typography>
          {/* payload[0].fill will have the color of the bar cell */}
          <Typography variant="body2" sx={{ color: payload[0].fill }}>
            {`Solved: ${payload[0].value}`}
          </Typography>
        </Paper>
      );
    }
    return null;
  };

  return (
    <Box sx={{ mt: 3, width: '100%'}}>
      <Typography variant="h6" gutterBottom align="center">
        Problems Solved per Rating Bucket
      </Typography>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={dataForBarChart}
          margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
          <XAxis dataKey="name" stroke={theme.palette.text.secondary} interval={0} />
          <YAxis allowDecimals={false} stroke={theme.palette.text.secondary} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: theme.palette.action.hover }} />
          {/* Legend is less useful with individual cell colors, can be removed or customized */}
          {/* <Legend wrapperStyle={{ paddingTop: '10px' }}/> */}

          <Bar dataKey="count" name="Problems Solved" radius={[4, 4, 0, 0]}>
            {dataForBarChart.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getRatingBucketColor(entry.name, theme)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );
};

export default ProblemRatingBarChart;