// client/src/components/student/RatingGraph.js
import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { format } from 'date-fns';
import { useTheme } from '@mui/material/styles'; // To get theme colors

const RatingGraph = ({ data }) => {
  const theme = useTheme(); // Get MUI theme for consistent styling

  if (!data || data.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '20px', border: `1px dashed ${theme.palette.divider}` }}>
        No rating data available for the selected period.
      </div>
    );
  }

  // Determine Y-axis domain with some padding
  const ratings = data.map(d => d.rating);
  const minRating = Math.min(...ratings);
  const maxRating = Math.max(...ratings);
  const yPadding = Math.max(50, Math.floor((maxRating - minRating) * 0.1)); // At least 50 padding or 10%
  
  const yDomain = [
    Math.max(0, minRating - yPadding), // Don't go below 0
    maxRating + yPadding
  ];


  // Custom Tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          backgroundColor: theme.palette.background.paper,
          border: `1px solid ${theme.palette.divider}`,
          padding: '10px',
          borderRadius: '4px',
          boxShadow: theme.shadows[3]
        }}>
          <p style={{ margin: 0, color: theme.palette.text.secondary }}>{`Date: ${format(new Date(label), 'PP')}`}</p>
          <p style={{ margin: '5px 0 0 0', color: theme.palette.primary.main }}>{`Rating: ${payload[0].value}`}</p>
          {payload[0].payload.name && <p style={{ margin: '5px 0 0 0', fontSize: '0.8em', color: theme.palette.text.disabled }}>{payload[0].payload.name}</p>}
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart
        data={data}
        margin={{
          top: 5,
          right: 30,
          left: 0, // Adjusted for better label visibility
          bottom: 20, // Increased bottom margin for XAxis labels
        }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
        <XAxis
          dataKey="time"
          tickFormatter={(unixTime) => format(new Date(unixTime), 'MMM d, yy')}
          stroke={theme.palette.text.secondary}
          angle={-30} // Angle labels to prevent overlap
          textAnchor="end" // Anchor angled labels at their end
          height={50} // Allocate more height for angled labels
          dy={10} // Nudge labels down
        />
        <YAxis
          stroke={theme.palette.text.secondary}
          domain={yDomain}
          allowDataOverflow={true} // Important with custom domain
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ paddingTop: '20px' }} /> {/* Add padding above legend */}
        <Line
          type="monotone"
          dataKey="rating"
          stroke={theme.palette.primary.main} // Use primary theme color
          strokeWidth={2}
          activeDot={{ r: 6 }}
          dot={{ r: 3, fill: theme.palette.primary.main }}
        />
        {/* Optional: Reference line for 1500 rating (e.g., pupil/specialist boundary) */}
        {/* <ReferenceLine y={1500} label="1500" stroke="red" strokeDasharray="3 3" /> */}
      </LineChart>
    </ResponsiveContainer>
  );
};

export default RatingGraph;