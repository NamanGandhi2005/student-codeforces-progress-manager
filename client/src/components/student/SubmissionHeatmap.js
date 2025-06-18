// client/src/components/student/SubmissionHeatmap.js
import React, { useMemo } from 'react';
import CalendarHeatmap from 'react-calendar-heatmap';
import 'react-calendar-heatmap/dist/styles.css';
import { Box, Typography, Paper } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { format, subYears, startOfDay, endOfDay, fromUnixTime, isWithinInterval, differenceInDays } from 'date-fns';

const SubmissionHeatmap = ({ submissions }) => {
  const theme = useTheme();

  const { values: heatmapValues, startDate, endDate, totalSubmissionsInPeriod } = useMemo(() => {
    if (!submissions || submissions.length === 0) { const today = new Date(); return { values: [], startDate: subYears(today, 1), endDate: today, totalSubmissionsInPeriod: 0 }; }
    const sortedSubmissions = [...submissions].sort((a, b) => a.creationTimeSeconds - b.creationTimeSeconds);
    if (sortedSubmissions.length === 0) { const today = new Date(); return { values: [], startDate: subYears(today, 1), endDate: today, totalSubmissionsInPeriod: 0 }; }
    const firstSubmissionDate = fromUnixTime(sortedSubmissions[0].creationTimeSeconds);
    let currentEndDate = endOfDay(new Date());
    let currentStartDate = startOfDay(subYears(currentEndDate, 1));
    if (firstSubmissionDate > currentStartDate) { currentStartDate = startOfDay(firstSubmissionDate); }
    if (currentEndDate < currentStartDate) { currentEndDate = endOfDay(fromUnixTime(sortedSubmissions[sortedSubmissions.length - 1].creationTimeSeconds));}
    const counts = {};
    let calculatedTotalSubmissionsInPeriod = 0;
    submissions.forEach(sub => {
      const submissionDateObj = fromUnixTime(sub.creationTimeSeconds);
      if (isWithinInterval(submissionDateObj, { start: currentStartDate, end: currentEndDate })) {
          const dateString = format(submissionDateObj, 'yyyy-MM-dd');
          counts[dateString] = (counts[dateString] || 0) + 1;
          calculatedTotalSubmissionsInPeriod++;
      }
    });
    const values = Object.entries(counts).map(([date, count]) => ({ date, count }));
    return { values, startDate: currentStartDate, endDate: currentEndDate, totalSubmissionsInPeriod: calculatedTotalSubmissionsInPeriod };
  }, [submissions]);

  const getTitleForValue = (value) => {
    if (!value || !value.date) return null;
    return `${format(new Date(value.date), 'MMM d, yyyy')}: ${value.count} submission${value.count === 1 ? '' : 's'}`;
  };

  const getClassForValue = (value) => {
    if (!value) return 'color-empty';
    if (value.count === 0) return 'color-empty';
    if (value.count <= 2) return 'color-scale-1';
    if (value.count <= 5) return 'color-scale-2';
    if (value.count <= 10) return 'color-scale-3';
    return 'color-scale-4';
  };

  const successPalette = theme.palette.success;
  const heatmapCellStyles = `
    .react-calendar-heatmap .color-empty {
      fill: ${theme.palette.mode === 'dark' ? theme.palette.action.disabledBackground : theme.palette.grey[200]};
      stroke: ${theme.palette.mode === 'dark' ? theme.palette.grey[700] : theme.palette.grey[300]};
      stroke-width: 0.5px;
    }
    .react-calendar-heatmap rect:hover {
      stroke: ${theme.palette.text.primary} !important;
      stroke-width: 1.5px !important;
    }
    .react-calendar-heatmap .color-scale-1 { fill: ${successPalette.lighter || '#C8E6C9'}; }
    .react-calendar-heatmap .color-scale-2 { fill: ${successPalette.light || '#81C784'}; }
    .react-calendar-heatmap .color-scale-3 { fill: ${successPalette.main || '#4CAF50'}; }
    .react-calendar-heatmap .color-scale-4 { fill: ${successPalette.dark || '#388E3C'}; }
    .react-calendar-heatmap rect.color-filled, .react-calendar-heatmap rect.color-empty {
      rx: 2; ry: 2;
    }
    /* Month Labels Styling: attempting to position them higher */
    .react-calendar-heatmap .react-calendar-heatmap-month-label {
      font-size: 9px;
      fill: ${theme.palette.text.secondary};
      /* alignment-baseline: text-before-edge; This can help if dy is not enough */
    }
    /* Weekday Labels Styling: attempting to position them further left */
    .react-calendar-heatmap .react-calendar-heatmap-weekday-label {
      font-size: 9px; /* Increased slightly for visibility */
      fill: ${theme.palette.text.secondary};
    }
  `;

  if (!submissions || submissions.length === 0) { /* ... no data ... */ }
  if (heatmapValues.length === 0 && submissions && submissions.length > 0) { /* ... no data in period ... */ }

  return (
    <Paper elevation={2} sx={{ p: {xs:1, sm:2}, mt: 3 }}>
      <style>{heatmapCellStyles}</style>
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
        <Typography variant="h6" component="h3">
          Submission Activity
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {totalSubmissionsInPeriod} submission{totalSubmissionsInPeriod !== 1 && 's'} in past year
        </Typography>
      </Box>

      {/* Add explicit padding to this Box to give space FOR the labels */}
      {/* The heatmap SVG will be rendered inside this box */}
      <Box sx={{ 
        overflowX: 'auto', 
        pb: 1,
        // Add padding here. The heatmap calculates its viewBox based on its content.
        // This padding gives "canvas" space around the heatmap for labels to sit in.
        paddingTop: '20px',  // More space for month labels
        paddingLeft: '25px', // More space for weekday labels
        // You might need to adjust the values below based on final appearance
      }}>
        <CalendarHeatmap
            startDate={startDate}
            endDate={endDate}
            values={heatmapValues}
            classForValue={getClassForValue}
            titleForValue={getTitleForValue} // For native browser tooltips
            showWeekdayLabels={true}
            weekdayLabels={['S', 'M', 'T', 'W', 'T', 'F', 'S']}
            
            squareSize={10}   // Keep squares relatively small
            gutterSize={2.5}    // Increase gutter slightly for more cell separation

            // These attributes directly style the <text> elements for labels
            monthLabelAttributes={{
                style: { fontSize: 9, fill: theme.palette.text.disabled },
                // dy is relative to the default y position. Negative moves up.
                // The library positions month labels at the top of the heatmap grid.
                // A 'y' attribute might be more direct if supported by the lib's prop.
                // Let's try to rely on the paddingTop of the parent Box.
                // y: -8 // Example to shift up, but padding on parent is often better
            }}
            weekdayLabelAttributes={{
                style: { fontSize: 9, fill: theme.palette.text.disabled },
                // dx is relative to the default x position. Negative moves left.
                // The library positions weekday labels to the left of the grid.
                // Let's try to rely on the paddingLeft of the parent Box.
                // x: -10 // Example to shift left
            }}
            // onClick={value => { ... }} // Remove or comment out the alert
        />
      </Box>
    </Paper>
  );
};

export default SubmissionHeatmap;