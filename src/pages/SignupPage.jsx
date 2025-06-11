// src/pages/SignupPage.jsx
import React, { useState } from 'react';
import { supabase } from '../supabase/supabaseClient';
import { useNavigate, Link } from 'react-router-dom';
import {
  Box,
  Button,
  TextField,
  Typography,
  Alert,
  Paper,
} from '@mui/material';

function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState(false);
  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();
    setMessage('');
    setError(false);

    if (password !== confirmPassword) {
      setError(true);
      setMessage('비밀번호가 일치하지 않습니다.');
      return;
    }

    const { error: signupError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signupError) {
      setError(true);
      setMessage(signupError.message);
    } else {
      setError(false);
      setMessage('회원가입이 완료되었습니다!');
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
          회원가입
        </Typography>
        <form onSubmit={handleSignup}>
          <TextField
            label="이메일"
            type="email"
            fullWidth
            margin="normal"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <TextField
            label="비밀번호"
            type="password"
            fullWidth
            margin="normal"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <TextField
            label="비밀번호 확인"
            type="password"
            fullWidth
            margin="normal"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
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
              backgroundColor: '#4FA3FF',
              '&:hover': {
                backgroundColor: '#6EBBFF',
              },
              color: '#FFFFFF',
              borderRadius: '8px',
            }}
          >
            회원가입
          </Button>
        </form>
        {message && (
          <Alert severity={error ? 'error' : 'success'} sx={{ mt: 2 }}>
            {message}
          </Alert>
        )}
        <Box textAlign="center" sx={{ mt: 3 }}>
          <Typography variant="body2" sx={{ color: '#666' }}>
            이미 계정이 있으신가요?{' '}
            <Link
              to="/login"
              style={{
                textDecoration: 'none',
                color: '#1E90FF',
                fontWeight: 500,
              }}
            >
              로그인
            </Link>
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
}

export default SignupPage;
