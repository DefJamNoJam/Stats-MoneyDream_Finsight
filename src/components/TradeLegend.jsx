// src/components/TradeLegend.jsx
import React from 'react';
import { Box, Typography, Tooltip, Paper } from '@mui/material';
import { ArrowUpward, ArrowDownward } from '@mui/icons-material';

const legendItems = [
  {
    icon: <Box sx={{ width: 14, height: 14, bgcolor: '#4caf50', borderRadius: 0.5, mr: 1 }} />,
    text: '상승 캔들',
    description: '캔들의 종가가 시가보다 높은 경우를 나타냅니다.',
  },
  {
    icon: <Box sx={{ width: 14, height: 14, bgcolor: '#f44336', borderRadius: 0.5, mr: 1 }} />,
    text: '하락 캔들',
    description: '캔들의 종가가 시가보다 낮은 경우를 나타냅니다.',
  },
  {
    icon: <ArrowUpward sx={{ color: '#9C27B0', fontSize: '1.1rem', mr: 1 }} />,
    text: '내 매수',
    description: '사용자가 직접 실행한 매수 거래 지점입니다.',
  },
  {
    icon: <ArrowDownward sx={{ color: '#FF9800', fontSize: '1.1rem', mr: 1 }} />,
    text: '내 매도',
    description: '사용자가 직접 실행한 매도 거래 지점입니다.',
  },
  {
    // icon: <ArrowUpward sx={{ color: '#4caf50', fontSize: '1.1rem', mr: 1 }} />,
    text: '💣 철수 Alert',
    description: '💣 지금은 조심할 타이밍입니다.',
  },
  {
    // icon: <ArrowDownward sx={{ color: '#f44336', fontSize: '1.1rem', mr: 1 }} />,
    text: '💰 영희 Alert',
    description: '💰 조용하지만 주목할 시점입니다.',
  },
];

function TradeLegend() {
  return (
    <Paper
      elevation={0}
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 2,
        py: 1.5,
        px: 2.5,
        borderRadius: 2,
        bgcolor: '#edf4ff',
        // border: '1px solid #e0e0e0',
        // mb: 2,
        mt: 1,
        width: 'fit-content'
      }}
    >
      {legendItems.map((item, index) => (
        <Tooltip key={index} title={item.description} arrow placement="top">
          <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'default' }}>
            {item.icon}
            <Typography variant="body2" sx={{ color: '#333', fontSize: '0.85rem' }}>
              {item.text}
            </Typography>
          </Box>
        </Tooltip>
      ))}
    </Paper>
  );
}

export default TradeLegend;