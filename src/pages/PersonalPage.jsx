// src/pages/PersonalPage.jsx

import React, { useState } from 'react';
import {
  Box,
  Tabs,
  Tab,
  CssBaseline,
  Container,
} from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import OneMinutePredictionTab from './OneMinutePredictionTab';
import DailyAnalysisTab from './DailyAnalysisTab';

const theme = createTheme({
  palette: {
    primary: {
      main: '#4FA3FF',
    },
  },
  typography: {
    fontFamily: 'Roboto, sans-serif',
  },
  components: {
    MuiTabs: {
      styleOverrides: {
        indicator: {
          display: 'none', // 하단 하늘색 밑줄 제거
        },
      },
    },
  },
});

function PersonalPage() {
  const [tabIndex, setTabIndex] = useState(0);

  const handleTabChange = (event, newValue) => {
    setTabIndex(newValue);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ zIndex: 1, position: 'relative', display: 'flex', justifyContent: 'center' }}>
          <Tabs
            value={tabIndex}
            onChange={handleTabChange}
            aria-label="prediction tabs"
            // sx={{ borderBottom: '1px solid #ddd' }}
          >
            {['📊 실시간 예측 (1분봉)', '📈 거래 분석 (일일봉)'].map((label, index) => (
              <Tab
                key={index}
                label={label}
                sx={{
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '1rem',
                  borderTopLeftRadius: '12px',
                  borderTopRightRadius: '12px',
                  backgroundColor: '#fff',
                  border: '1px solid #ddd',
                  borderBottom: tabIndex === index ? '1px solid #fff !important' : '1px solid #fff',
                  color: tabIndex === index ? '#4FA3FF' : '#666',
                  mr: 1,
                  px: 3,
                  py: 1.5,
                  zIndex: tabIndex === index ? 1 : 0,
                  transition: 'background-color 0.3s ease',
                  '&:hover': {
                    backgroundColor: '#f0f4f8',
                  },
                  ...(tabIndex === index && {
                  backgroundColor: '#f0f4f8 !important',
                  }),
                }}
              />
            ))}
          </Tabs>
        </Box>

        <Box
          sx={{
            border: '1px solid #ddd',
            // borderTop: 'none',
            borderRadius: '0 0 12px 12px',
            backgroundColor: '#fff',
            // p: 3,
          }}
        >
          {tabIndex === 0 && <OneMinutePredictionTab />}
          {tabIndex === 1 && <DailyAnalysisTab />}
        </Box>
      </Container>
    </ThemeProvider>
  );
}

export default PersonalPage;
