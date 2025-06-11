import { useMemo, useCallback } from 'react';

// 상수 정의: 실수 유형
const MISTAKE_TYPES = {
  PANIC_SELL: '패닉 매도',
  FOMO_BUY: 'FOMO 매수',
  CHEOLSU_ALERT: '철수 경고 (사지 말 것)', // 새로운 실수 유형 추가
};

// 유틸리티: 숫자 파싱
const parseNumber = (value, defaultValue = 0) => {
  const num = parseFloat(value);
  return isNaN(num) ? defaultValue : num;
};

// 유틸리티: RSI 계산 (14일 기준)
const calculateRSI = (closes, period = 14) => {
  if (closes.length < period) return null;
  let gains = 0;
  let losses = 0;
  for (let i = 1; i < period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) gains += diff;
    else losses -= diff;
  }
  const avgGain = gains / period;
  const avgLoss = Math.abs(losses / period);
  const rs = avgGain / (avgLoss || 1); // 0으로 나누기 방지
  return 100 - (100 / (1 + rs));
};

// 유틸리티: EMA 계산 (14일 기준)
const calculateEMA = (closes, period = 14) => {
  if (closes.length < period) return null;
  const k = 2 / (period + 1);
  let ema = closes[0];
  for (let i = 1; i < closes.length; i++) {
    ema = closes[i] * k + ema * (1 - k);
  }
  return ema;
};

// 유틸리티: SMA 계산 (20일 거래량 평균)
const calculateSMA = (values, period = 20) => {
  if (values.length < period) return null;
  const slice = values.slice(-period);
  return slice.reduce((sum, val) => sum + val, 0) / period;
};

export const useMistakeAnalysis = (signalScenarioData, chartData) => {
  const mistakePatterns = useMemo(() => {
    const mistakes = [];

    if (!Array.isArray(signalScenarioData) || signalScenarioData.length === 0 || !Array.isArray(chartData) || chartData.length === 0) {
      console.log('Invalid input data:', { signalScenarioData, chartData });
      return mistakes;
    }

    signalScenarioData.forEach((scenario) => {
      const buyPrice = parseNumber(scenario.price, NaN);
      const sellPrice = parseNumber(scenario.sellPrice, NaN);
      const buyDate = new Date(scenario.date);
      const sellDate = new Date(scenario.sellDate);
      const executedQuantity = parseNumber(scenario.executedQty, 1);

      if (
        isNaN(buyDate.getTime()) ||
        isNaN(sellDate.getTime()) ||
        isNaN(buyPrice) ||
        isNaN(sellPrice)
      ) {
        if (process.env.NODE_ENV === 'development') {
          console.warn("Skipping invalid scenario for mistake analysis:", scenario);
        }
        return;
      }

      // 1. 패닉 매도 식별
      if (sellPrice < buyPrice) {
        mistakes.push({
          date: sellDate.toISOString(),
          price: sellPrice,
          mistakeType: MISTAKE_TYPES.PANIC_SELL,
          pnl: (sellPrice - buyPrice) * executedQuantity,
          mistakeDescription: `매수가(${buyPrice.toFixed(2)})보다 낮은 가격(${sellPrice.toFixed(2)})에 매도`,
        });
      }

      // 2. FOMO 매수 식별
      const recentChartData7 = chartData.filter((d) => {
        const chartTime = new Date(d.time);
        return (
          !isNaN(chartTime.getTime()) &&
          chartTime <= buyDate &&
          chartTime >= new Date(buyDate.getTime() - 7 * 24 * 60 * 60 * 1000)
        );
      });
      const recentHigh = recentChartData7.length > 0
        ? Math.max(...recentChartData7.map(d => parseNumber(d.high, 0)))
        : 0;
      if (recentHigh > 0 && buyPrice >= recentHigh * 0.95) {
        mistakes.push({
          date: buyDate.toISOString(),
          price: buyPrice,
          mistakeType: MISTAKE_TYPES.FOMO_BUY,
          pnl: null,
          mistakeDescription: `최근 7일 고점(${recentHigh.toFixed(2)}) 대비 5% 이내 가격(${buyPrice.toFixed(2)})에 매수`,
        });
      }

      // 3. 철수 경고 (Cheolsu Alert) 식별
      const recentChartData14 = chartData.filter((d) => {
        const chartTime = new Date(d.time);
        return (
          !isNaN(chartTime.getTime()) &&
          chartTime <= buyDate &&
          chartTime >= new Date(buyDate.getTime() - 14 * 24 * 60 * 60 * 1000)
        );
      });
      const closes = recentChartData14.map(d => parseNumber(d.close, 0));
      const volumes = recentChartData14.map(d => parseNumber(d.volume || 0, 0));
      const rsi = closes.length >= 14 ? calculateRSI(closes.slice(-14)) : null;
      const ema = closes.length >= 14 ? calculateEMA(closes.slice(-14)) : null;
      const volMa = volumes.length >= 20 ? calculateSMA(volumes.slice(-20)) : null;
      const currentClose = parseNumber(recentChartData14[recentChartData14.length - 1]?.close, 0);
      const currentVolume = parseNumber(recentChartData14[recentChartData14.length - 1]?.volume || 0, 0);

      console.log('Cheolsu Alert Debug:', {
        rsi,
        ema,
        volMa,
        currentClose,
        currentVolume,
        buyPrice,
        condition: rsi > 70 && currentClose > ema && currentVolume > volMa * 1.5,
      });

      if (
        rsi && ema && volMa &&
        rsi > 70 &&
        currentClose > ema &&
        currentVolume > volMa * 1.5 &&
        Math.abs(buyPrice - currentClose) / currentClose < 0.02 // 매수가가 현재 종가와 2% 이내
      ) {
        mistakes.push({
          date: buyDate.toISOString(),
          price: buyPrice,
          mistakeType: MISTAKE_TYPES.CHEOLSU_ALERT,
          pnl: null,
          mistakeDescription: `RSI(${rsi.toFixed(2)})>70, 종가(${currentClose.toFixed(2)})>EMA(${ema.toFixed(2)}), 거래량 급등 조건 충족`,
        });
      }
    });

    return mistakes;
  }, [signalScenarioData, chartData]);

  const analyzeMistakes = useCallback(() => {
    const summary = {
      panicCount: mistakePatterns.filter(m => m.mistakeType === MISTAKE_TYPES.PANIC_SELL).length,
      fomoCount: mistakePatterns.filter(m => m.mistakeType === MISTAKE_TYPES.FOMO_BUY).length,
      cheolsuCount: mistakePatterns.filter(m => m.mistakeType === MISTAKE_TYPES.CHEOLSU_ALERT).length,
      totalMistakes: mistakePatterns.length,
    };

    const grouped = mistakePatterns.reduce((acc, item) => {
      const type = item.mistakeType;
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push(item);
      return acc;
    }, {});

    return {
      patterns: mistakePatterns,
      summary,
      groupedPatterns: grouped,
    };
  }, [mistakePatterns]);

  return {
    analyzeMistakes,
    mistakeAnalysis: {
      patterns: mistakePatterns,
    },
  };
};