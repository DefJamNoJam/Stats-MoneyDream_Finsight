// src/pages/LoginPage.jsx
import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { supabase } from '../supabase/supabaseClient';
import {
  Box,
  Button,
  TextField,
  Typography,
  Alert,
  Paper,
} from '@mui/material';

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from || location.pathname || '/';

  const handleLogin = async (e) => {
    e.preventDefault();
    setMessage('');

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMessage(error.message);
    } else {
      const redirectPath = from === '/login' ? '/' : from;
      navigate(redirectPath, { replace: true });
    }
  };

  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      minHeight="80vh"
      sx={{ backgroundColor: '#f4f7fb' }}
    >
      <Paper
        elevation={4}
        sx={{
          p: 4,
          width: '100%',
          maxWidth: 400,
          borderRadius: '16px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
        }}
      >
        <Typography
          variant="h5"
          component="h1"
          gutterBottom
          align="center"
          fontWeight="bold"
          sx={{ color: '#1C1C1C' }}
        >
          로그인
        </Typography>
        <form onSubmit={handleLogin}>
          <TextField
            label="이메일"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            fullWidth
            margin="normal"
            required
          />
          <TextField
            label="비밀번호"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            fullWidth
            margin="normal"
            required
          />
        <Button
          type="submit"
          variant="contained"
          fullWidth
          sx={{
            mt: 3,
            py: 1.2,
            fontWeight: 600,
            backgroundColor: '#4FA3FF', // 밝은 블루
            '&:hover': {
              backgroundColor: '#6EBBFF', // hover 시 더 밝게
            },
            color: '#FFFFFF', // hover에서도 텍스트 선명하게
            borderRadius: '8px',
          }}
        >
          로그인
        </Button>

        </form>
        {message && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {message}
          </Alert>
        )}
        <Box textAlign="center" sx={{ mt: 3 }}>
          <Typography variant="body2" sx={{ color: '#666' }}>
            계정이 없으신가요?{' '}
            <Link
              to="/signup"
              style={{
                textDecoration: 'none',
                color: '#1E90FF',
                fontWeight: 500,
              }}
            >
              회원가입
            </Link>
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
}

export default LoginPage;
