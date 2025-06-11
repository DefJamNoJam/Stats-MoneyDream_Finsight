import React from 'react';
import { Box, Typography, Button, Divider } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import PageLayout from '../components/PageLayout';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'; // ⬇️ 아이콘 추가

function HomePage() {
  const navigate = useNavigate();

  return (
    <PageLayout title="">
      {/* ✅ 하늘색 전체 박스 */}
      <Box
        sx={{
          backgroundColor: '#E6F2FF',
          px: 2,
          pt: 8,
          pb: 10,
        }}
      >
        {/* ✅ Hero Section */}
        <Box
          sx={{
            height: '75vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            position: 'relative',
          }}
        >
          <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
            데이터 위에, 당신의 판단을 더하다.
          </Typography>
          <Typography variant="body1" sx={{ color: '#555', maxWidth: 600, mb: 4 }}>
            실시간 시장 분석과 개인화된 트레이딩 인사이트를 경험해보세요.
          </Typography>
          <Button
            variant="contained"
            sx={{
              backgroundColor: '#4FA3FF',
              '&:hover': { backgroundColor: '#6EBBFF' },
              px: 4,
              py: 1.3,
              fontWeight: 'bold',
              fontSize: '1rem',
              borderRadius: '8px',
            }}
            onClick={() => navigate('/market')}
          >
            시장 살펴보기
          </Button>

          {/* ✅ 스크롤 유도 화살표 */}
          <Box
            sx={{
              position: 'absolute',
              bottom: 20,
              animation: 'bounce 2s infinite',
              color: '#1976d2',
            }}
          >
            <KeyboardArrowDownIcon fontSize="large" />
          </Box>
        </Box>

        {/* ✅ 소개 + 기능 설명 전체 (하늘색 배경 안) */}
        <Box sx={{ maxWidth: '900px', mx: 'auto', textAlign: 'left', mt: 4 }}>
          <Typography variant="h6" fontWeight="bold" mb={2}>
            Finsight: AI 기반 암호화폐 투자 분석 플랫폼
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={3} lineHeight={1.8}>
            Finsight는 암호화폐 투자자를 위한 AI 기반 분석 플랫폼입니다.<br />
            최신 인공지능 기술과 실시간 데이터를 통해 사용자의 암호화폐 투자 의사결정을 스마트하고 효율적으로 지원합니다.
          </Typography>

          <Divider sx={{ mb: 3 }} />

          <Typography variant="subtitle1" fontWeight="bold" mb={1}>
            Market Page (시장 흐름 분석)
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={2} lineHeight={2.2}>
            Binance 실시간 차트와 Google 트렌드 데이터를 연동하여 시장의 흐름과 추세를 시각적으로 제공합니다.<br />
            M2 통화량 데이터 및 다양한 보조지표(RSI, MACD, 볼린저밴드 등)를 결합하여 복잡한 시장 환경을 손쉽게 파악할 수 있도록 돕습니다.<br />
            OpenAI의 최신 인공지능 API를 활용해 방대한 데이터를 분석하고, 투자에 유의미한 최신 인사이트와 패턴을 제공합니다.
          </Typography>

          <Typography variant="subtitle1" fontWeight="bold" mb={1}>
            Personal Page (개인 맞춤형 투자 분석)
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={1} lineHeight={1.7}>
            회원가입 후 로그인한 사용자에게만 제공되는 개인 맞춤형 서비스로, 두 가지 탭 형태로 구성되어 있습니다.
          </Typography>
          <Typography variant="body2" mb={1.5} lineHeight={1.7}>
            <strong>1분봉 실시간 AI 예측 (LSTM 기반) :</strong> LSTM 모델이 1분봉 데이터를 기반으로 다음 캔들의 예상 상·하단을 예측해 밴드 형태로 시각화합니다.
          </Typography>
          <Typography variant="body2" mb={2} lineHeight={1.7}>
            <strong>일일봉 개인 거래 분석 :</strong> 사용자의 거래 내역(CSV)을 업로드하면 FOMO 매수, 패닉 매도와 같은 실수를 분석해 개선 방향을 제시합니다.
          </Typography>

          <Divider sx={{ my: 3 }} />

          <Typography variant="subtitle1" fontWeight="bold" mb={1}>
            이런 분들께 추천합니다!
          </Typography>
          <Typography variant="body2" color="text.secondary" lineHeight={2.2} mb={4}>
            • 암호화폐 시장의 흐름을 빠르고 정확하게 파악하고 싶은 투자자<br />
            • 개인 거래 데이터를 기반으로 투자 전략을 개선하고 싶은 사용자<br />
            • 복잡한 기술 지표나 방대한 데이터를 쉽고 빠르게 이해하고 싶은 투자자<br />
            • 인공지능과 최신 데이터를 통해 효율적으로 트레이딩 성과를 높이고 싶은 모든 분들
          </Typography>
        </Box>
      </Box>

      <Box sx={{ mt: 4, pb: 6 }}>
        <Typography variant="body2" sx={{ textAlign: 'center', color: '#777' }}>
          Finsight는 개인 투자자들을 위한 실시간 시장 분석 플랫폼입니다.
          <br />
          회원가입 후 더 많은 기능을 이용해보세요!
        </Typography>
      </Box>

      {/* ✅ 화살표 애니메이션 스타일 정의 */}
      <style>
        {`
        @keyframes bounce {
          0%, 20%, 50%, 80%, 100% {
            transform: translateY(0);
          }
          40% {
            transform: translateY(8px);
          }
          60% {
            transform: translateY(4px);
          }
        }
        `}
      </style>
    </PageLayout>
  );
}

export default HomePage;
