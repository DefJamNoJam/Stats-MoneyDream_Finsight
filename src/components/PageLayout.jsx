// src/components/PageLayout.jsx
import React from 'react';
import { Container, Box, Typography } from '@mui/material';

const PageLayout = ({ children, title = "", subtitle = "", subtitle2 = "" }) => {
  return (
    <Container maxWidth="lg" sx={{ py: 4, fontFamily: 'Roboto, sans-serif' }}>
      {(title.trim() !== "" || subtitle.trim() !== "" || subtitle2.trim() !== "") && (
        <Box mb={3}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              mb: 3
            }}
          >
            <Typography variant="h5" fontWeight={700}>
              {title}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="text.secondary" mt={1} fontSize={'0.8125rem'} >
                {subtitle}
              </Typography>
            )}
            {subtitle2 && (
              <Typography variant="body2" color="#ff8800" mt={0.5} fontSize={'0.65rem'} fontStyle={'oblique'} style={{textDecoration: 'underline', textUnderlinePosition: 'under'}}>
                {subtitle2}
              </Typography>
            )}
          </Box>
        </Box>
      )}
      {children}
    </Container>
  );
};

export default PageLayout;
