// client/src/components/student/ProblemTagsChart.js
import React, { useState } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Sector // For active shape
} from 'recharts';
import { useTheme } from '@mui/material/styles';
import { Box, Typography, Paper } from '@mui/material';

// Define a set of colors for the pie chart slices
// You can expand this list or use a color generation library
const PIE_COLORS = [
  '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8',
  '#82CA9D', '#FFC0CB', '#A52A2A', '#DEB887', '#5F9EA0',
  '#7FFF00', '#D2691E', '#FF7F50', '#6495ED', '#DC143C'
];


// Custom active shape for the pie chart (optional, for better hover effect)
const renderActiveShape = (props) => {
  const RADIAN = Math.PI / 180;
  const { cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value } = props;
  const sin = Math.sin(-RADIAN * midAngle);
  const cos = Math.cos(-RADIAN * midAngle);
  const sx = cx + (outerRadius + 10) * cos;
  const sy = cy + (outerRadius + 10) * sin;
  const mx = cx + (outerRadius + 20) * cos; // Increased from 30
  const my = cy + (outerRadius + 20) * sin; // Increased from 30
  const ex = mx + (cos >= 0 ? 1 : -1) * 12; // Increased from 22
  const ey = my;
  const textAnchor = cos >= 0 ? 'start' : 'end';

  return (
    <g>
      <text x={cx} y={cy} dy={8} textAnchor="middle" fill={fill} fontWeight="bold">
        {payload.name}
      </text>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      <Sector // This creates the "exploded" effect on hover
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={outerRadius + 6}
        outerRadius={outerRadius + 10}
        fill={fill}
      />
      <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none" />
      <circle cx={ex} cy={ey} r={2} fill={fill} stroke="none" />
      <text x={ex + (cos >= 0 ? 1 : -1) * 6} y={ey} textAnchor={textAnchor} fill="#333" style={{fill: props.theme.palette.text.primary}}>{`${value} (${(percent * 100).toFixed(0)}%)`}</text>
    </g>
  );
};


const ProblemTagsChart = ({ tagData }) => { // Expects data like [{ name: 'dp', value: 10 }, ...]
  const theme = useTheme();
  const [activeIndex, setActiveIndex] = useState(0); // For active shape interaction

  const onPieEnter = (_, index) => {
    setActiveIndex(index);
  };
  
  const onPieLeave = () => {
    // setActiveIndex(null); // Or keep the last active index, depends on desired UX
  };

  if (!tagData || tagData.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', p: 2, border: `1px dashed ${theme.palette.divider}`, mt: 3, minHeight: 250, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography color="text.secondary">No tag data available for solved problems in this period.</Typography>
      </Box>
    );
  }

  // Limit the number of tags shown in the pie chart directly for readability, e.g., top 10
  // Others can be grouped into "Others" or shown in a legend/table.
  const MAX_PIE_SLICES = 8;
  let chartData = tagData;
  if (tagData.length > MAX_PIE_SLICES) {
      const topTags = tagData.slice(0, MAX_PIE_SLICES -1);
      const otherTagsValue = tagData.slice(MAX_PIE_SLICES -1).reduce((acc, curr) => acc + curr.value, 0);
      if (otherTagsValue > 0) {
        chartData = [...topTags, { name: 'Others', value: otherTagsValue }];
      } else {
        chartData = topTags;
      }
  }


  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <Paper elevation={3} sx={{ p: 1.5, backgroundColor: theme.palette.background.paper }}>
          <Typography variant="subtitle2" gutterBottom>
            {`${payload[0].name}: ${payload[0].value} (${(payload[0].percent * 100).toFixed(1)}%)`}
          </Typography>
        </Paper>
      );
    }
    return null;
  };


  return (
    <Paper elevation={2} sx={{ p: {xs:1, sm:2}, mt: 3 }}>
      <Typography variant="h6" gutterBottom align="center" component="h3">
        Solved Problems by Tag
      </Typography>
      <ResponsiveContainer width="100%" height={350}> {/* Increased height for pie chart */}
        <PieChart>
          <Pie
            activeIndex={activeIndex}
            activeShape={(props) => renderActiveShape({...props, theme: theme})} // Pass theme to active shape
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            // label={renderCustomizedLabel} // Can add custom labels if needed
            outerRadius={100} // Adjust radius
            innerRadius={50}  // For donut chart effect
            fill={theme.palette.primary.main} // Default fill, overridden by Cells
            dataKey="value"
            onMouseEnter={onPieEnter}
            onMouseLeave={onPieLeave} // Optional: reset activeIndex on mouse leave
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            layout="horizontal" 
            verticalAlign="bottom" 
            align="center" 
            wrapperStyle={{paddingTop: 10}}
          />
        </PieChart>
      </ResponsiveContainer>
    </Paper>
  );
};

export default ProblemTagsChart;