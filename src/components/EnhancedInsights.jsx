// components/EnhancedInsights.jsx
import React from 'react';
import { Box, Typography, Chip, Tooltip, Divider } from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import WarningIcon from '@mui/icons-material/Warning';

const mistakeTypeConfig = {
  '고점 매수 후 손실': {
    icon: <TrendingUpIcon fontSize="small" />, color: 'error', tooltip: '상승장 고점에서 매수하여 손실 발생'
  },
  '저점 매도 후 반등': {
    icon: <TrendingDownIcon fontSize="small" />, color: 'warning', tooltip: '하락장 저점에서 매도 후 반등하여 손해'
  },
  '변동성 높은 구간 진입': {
    icon: <WarningIcon fontSize="small" />, color: 'secondary', tooltip: '변동성이 큰 시기에 진입해 손실 발생'
  },
  '추세 반전 전 매수': {
    icon: <WarningIcon fontSize="small" />, color: 'info', tooltip: '추세 전환 직전 매수하여 손실 발생'
  },
  '기타 손실': {
    icon: <WarningIcon fontSize="small" />, color: 'default', tooltip: '기타 패턴으로 분류되지 않는 손실'
  }
};

const EnhancedInsights = ({ summary, totalTrades, avgHoldDays, winRate, avgProfit, avgLoss, maxProfit, maxLoss, fomoPanicCount }) => {
  const renderChips = () =>
    Object.entries(summary).map(([type, count], i) => {
      const config = mistakeTypeConfig[type] || {};
      return (
        <Tooltip key={i} title={config.tooltip || type} arrow>
          <Chip
            icon={config.icon || <WarningIcon fontSize="small" />}
            label={`${type} (${count}건)`}
            color={config.color || 'default'}
            variant="outlined"
            sx={{ m: 0.5 }}
          />
        </Tooltip>
      );
    });

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="h6" gutterBottom>🧠 분석 인사이트 요약</Typography>
      <Typography variant="body2" gutterBottom>
        📈 평균 보유 기간은 <b>{avgHoldDays.toFixed(1)}일</b>로 단기 트레이딩 성향이 강합니다.
      </Typography>
      <Typography variant="body2" gutterBottom>
        ⚠️ 승률은 <b>{winRate.toFixed(1)}%</b>로 낮은 편입니다.
      </Typography>
      <Typography variant="body2" gutterBottom>
        📉 평균 수익 {avgProfit.toFixed(2)} USDT, 평균 손실 {avgLoss.toFixed(2)} USDT → 손실이 더 큽니다.
      </Typography>
      <Typography variant="body2" gutterBottom>
        📊 최대 수익 {maxProfit.toFixed(2)} USDT / 최대 손실 {maxLoss.toFixed(2)} USDT → 리스크 관리가 필요합니다.
      </Typography>
      <Typography variant="body2" gutterBottom>
        😨 FOMO/패닉 매매가 <b>{fomoPanicCount}건</b>으로 전체의 <b>{((fomoPanicCount / totalTrades) * 100).toFixed(1)}%</b>를 차지합니다.
      </Typography>

      <Divider sx={{ my: 2 }} />

      <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
        🎯 실수 패턴 요약
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', mt: 1 }}>
        {renderChips()}
      </Box>

      <Typography variant="body2" sx={{ mt: 2, fontStyle: 'italic', color: 'text.secondary' }}>
        — 감정적 매매 비중이 높고, 고점 진입 등 위험 패턴이 반복되고 있습니다. 진입 전략의 객관화와 체크리스트 기반 매매를 추천합니다.
      </Typography>
    </Box>
  );
};

export default EnhancedInsights;
