// src/components/UploadControls.jsx
import React from 'react';
import {
  Box,
  Button,
  Typography,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  CircularProgress,
  Paper,
} from '@mui/material';

const visuallyHidden = {
  border: 0,
  clip: 'rect(0 0 0 0)',
  height: 1,
  margin: -1,
  overflow: 'hidden',
  padding: 0,
  position: 'absolute',
  top: 20,
  width: 1,
};

const UploadControls = ({
  selectedSymbol,
  handleSymbolChange,
  selectedPeriod,
  handlePeriodChange,
  loading,
  fileName,
  tradeCount,
  handleFileUpload,
}) => {
  return (
    <Paper
      elevation={2}
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 2,
        p: 2,
        // mb: 2,
        borderRadius: 2,
        backgroundColor: '#f9fbfd',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)',
      }}
    >
      <FormControl size="small" sx={{ minWidth: 140 }}>
        <InputLabel id="symbol-label">종목</InputLabel>
        <Select
          labelId="symbol-label"
          value={selectedSymbol}
          label="종목"
          onChange={handleSymbolChange}
          disabled={loading}
        >
          <MenuItem value="BTCUSDT">BTC/USDT</MenuItem>
        </Select>
      </FormControl>

      <FormControl size="small" sx={{ minWidth: 120 }}>
        <InputLabel id="period-label">기간</InputLabel>
        <Select
          labelId="period-label"
          value={selectedPeriod}
          label="기간"
          onChange={handlePeriodChange}
          disabled={loading}
        >
          <MenuItem value="1h">1시간</MenuItem>
          <MenuItem value="1d">1일</MenuItem>
        </Select>
      </FormControl>

      <Box sx={{ display: 'flex', flexDirection: 'row', gap: 1, alignItems: 'center' }}>
        <Button
          variant="contained"
          component="label"
          disabled={loading}
          sx={{ borderRadius: 2, fontWeight: 600, padding: '8px 16px' }}
        >
          📂 CSV 업로드
          <input
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            style={visuallyHidden}
          />
        </Button>
        <Box sx={{display: 'flex', flexDirection:' column', justifyContent:'space-between'}}>
          <Typography variant="caption" style={{ color: '#ff0000'}}>※ csv 파일만 업로드 가능합니다.</Typography>

          {fileName && (
            <Typography variant="caption" sx={{ color: '#555' }}>
              업로드됨: {fileName} ({tradeCount}건)
            </Typography>
          )}
        </Box>
      </Box>

      {loading && <CircularProgress size={24} sx={{ ml: 1 }} />}
    </Paper>
  );
};

export default UploadControls;