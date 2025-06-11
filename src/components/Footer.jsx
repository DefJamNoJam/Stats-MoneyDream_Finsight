// src/components/Footer.jsx
import React from 'react';
import { Box, Typography } from '@mui/material';
import MyLogo from '../assets/finsight_logo.png';

function Footer() {
  return (
    <Box
      sx={{
        height: '64px',
        backgroundColor: '#f9fbfd',
        borderTop: '1px solid #e0e0e0',
        py: 2,
        px: 4,
      }}
    >
      <Box
        sx={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          height: '100%',
        }}
      >
        <img
          src={MyLogo}
          alt="Finsight Logo"
          style={{
            width: '80px',
            height: 'auto',
            marginRight: '16px',
            borderRadius: '4px',
          }}
        />
        <Typography variant="body2" sx={{ color: '#666666' }}>
          © 2025 Finsight — 데이터 위에, 당신의 판단을 더하다.
        </Typography>
      </Box>
    </Box>
  );
}

export default Footer;
