// src/components/Header.jsx
import React, { useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Box, Button, Typography } from '@mui/material';
import MyLogo from '../assets/finsight_logo.png';
import { AuthContext } from '../contexts/AuthContext';
import { Padding } from '@mui/icons-material';

function Header() {
  const location = useLocation();
  const { user, isAuthenticated, logout } = useContext(AuthContext);

  const handleLogout = async () => {
    try {
      await logout();
      window.location.href = '/';
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const navLinkStyle = (path) => ({
    fontWeight: 'bold',
    color: location.pathname === path ? '#4FA3FF' : '#1C1C1C',
    borderBottom: location.pathname === path ? '2px solid #4FA3FF' : 'none',
    borderRadius: 0,
    '&:hover': {
      color: '#6EBBFF',
      backgroundColor: 'transparent',
    },
    padding : 0,
  });

  return (
    <Box
      sx={{
        height: '64px',
        borderBottom: '1px solid #eaeaea',
        backgroundColor: '#ffffff',
        py: 1,
        px: 4,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          maxWidth: '1200px',
          margin: '0 auto',
          height: '100%',
        }}
      >
        <Box
          component={Link}
          to="/"
          sx={{
            display: 'flex',
            alignItems: 'center',
            textDecoration: 'none',
            cursor: 'pointer',
          }}
        >
          <img
            src={MyLogo}
            alt="Finsight Logo"
            style={{
              // width: '100px',
              // height: 'auto',
              height: '75px'
            }}
          />
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <Button component={Link} to="/market" sx={navLinkStyle('/market')}>
            MARKET
          </Button>
          <Button component={Link} to="/personal" sx={navLinkStyle('/personal')}>
            PERSONAL
          </Button>
          {isAuthenticated ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" sx={{ color: '#4FA3FF' }}>
                {user?.email}님
              </Typography>
              <Button
                onClick={handleLogout}
                sx={{
                  fontWeight: 'bold',
                  color: '#1C1C1C',
                  '&:hover': {
                    color: '#6EBBFF',
                  },
                }}
              >
                LOG OUT
              </Button>
            </Box>
          ) : (
            <Button component={Link} to="/login" state={{ from: location.pathname }} sx={navLinkStyle('/login')}>
              LOG IN
            </Button>
          )}
        </Box>
      </Box>
    </Box>
  );
}

export default Header;
