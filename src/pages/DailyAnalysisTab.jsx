// src/pages/DailyAnalysisTab.jsx
import React, { useState, useEffect, useMemo } from 'react';
import Plot from 'react-plotly.js';
import {
  Box,
  CssBaseline,
  Alert,
  Typography,
  List,
  ListItem,
  ListItemText,
  Button
} from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import PageLayout from '../components/PageLayout';
import UploadControls from '../components/UploadControls';
import TradeLegend from '../components/TradeLegend';
import InsightsPanel from '../components/Insights';

import { useChartData } from '../hooks/useChartData';
import { useSafeTradeUpload } from '../hooks/useSafeTradeUpload';
import { useMistakeAnalysis } from '../hooks/useMistakeAnalysis';
import useGptAnalysis from '../hooks/useGptAnalysis'; // GPT 분석 커스텀 훅
import '../utils/PersonalPage.css';

// 철수 Alert 훅 (조건: RSI > 70, 종가 > EMA, 거래량 > 볼륨평균 * 1.5)
const useCheolsuAlert = (chartData) => {
  return useMemo(() => {
    if (!Array.isArray(chartData) || chartData.length < 20) return [];
    const alerts = [];
    const parseNumber = (value) => parseFloat(value) || 0;
    const calculateRSI = (closes, period = 14) => {
      if (closes.length < period) return null;
      let gains = 0, losses = 0;
      for (let i = 1; i < period; i++) {
        const diff = closes[i] - closes[i - 1];
        if (diff > 0) gains += diff;
        else losses -= diff;
      }
      const avgGain = gains / period;
      const avgLoss = Math.abs(losses / period);
      const rs = avgGain / (avgLoss || 1);
      return 100 - (100 / (1 + rs));
    };
    const calculateEMA = (closes, period = 14) => {
      if (closes.length < period) return null;
      const k = 2 / (period + 1);
      let ema = closes[0];
      for (let i = 1; i < closes.length; i++) {
        ema = closes[i] * k + ema * (1 - k);
      }
      return ema;
    };
    const calculateSMA = (values, period = 20) => {
      if (values.length < period) return null;
      const slice = values.slice(-period);
      return slice.reduce((sum, val) => sum + val, 0) / period;
    };

    chartData.forEach((candle, index) => {
      if (index < 19) return;
      const recentData = chartData.slice(index - 19, index + 1);
      const closes = recentData.map(d => parseNumber(d.close));
      const volumes = recentData.map(d => parseNumber(d.volume || 0));
      const rsi = calculateRSI(closes);
      const ema = calculateEMA(closes);
      const volMa = calculateSMA(volumes);
      const currentClose = parseNumber(candle.close);
      const currentVolume = parseNumber(candle.volume || 0);

      if (rsi && ema && volMa && rsi > 70 && currentClose > ema && currentVolume > volMa * 1.5) {
        alerts.push({
          date: candle.time,
          price: currentClose,
          description: `Cheolsu Alert: RSI(${rsi.toFixed(2)})>70, 종가(${currentClose.toFixed(2)})>EMA(${ema.toFixed(2)}), 거래량(${currentVolume}) > ${(volMa * 1.5).toFixed(2)}`,
        });
      }
    });
    return alerts;
  }, [chartData]);
};

// 영희 Alert 훅 (조건: RSI < 30, 종가 < EMA, 거래량 < 볼륨평균 * 0.8)
const useYoungheeAlert = (chartData) => {
  return useMemo(() => {
    if (!Array.isArray(chartData) || chartData.length < 20) return [];
    const alerts = [];
    const parseNumber = (value) => parseFloat(value) || 0;
    const calculateRSI = (closes, period = 14) => {
      if (closes.length < period) return null;
      let gains = 0, losses = 0;
      for (let i = 1; i < period; i++) {
        const diff = closes[i] - closes[i - 1];
        if (diff > 0) gains += diff;
        else losses -= diff;
      }
      const avgGain = gains / period;
      const avgLoss = Math.abs(losses / period);
      const rs = avgGain / (avgLoss || 1);
      return 100 - (100 / (1 + rs));
    };
    const calculateEMA = (closes, period = 14) => {
      if (closes.length < period) return null;
      const k = 2 / (period + 1);
      let ema = closes[0];
      for (let i = 1; i < closes.length; i++) {
        ema = closes[i] * k + ema * (1 - k);
      }
      return ema;
    };
    const calculateSMA = (values, period = 20) => {
      if (values.length < period) return null;
      const slice = values.slice(-period);
      return slice.reduce((sum, val) => sum + val, 0) / period;
    };

    chartData.forEach((candle, index) => {
      if (index < 19) return;
      const recentData = chartData.slice(index - 19, index + 1);
      const closes = recentData.map(d => parseNumber(d.close));
      const volumes = recentData.map(d => parseNumber(d.volume || 0));
      const rsi = calculateRSI(closes);
      const ema = calculateEMA(closes);
      const volMa = calculateSMA(volumes);
      const currentClose = parseNumber(candle.close);
      const currentVolume = parseNumber(candle.volume || 0);

      if (rsi && ema && volMa && rsi < 30 && currentClose < ema && currentVolume < volMa * 0.8) {
        alerts.push({
          date: candle.time,
          price: currentClose,
          description: `Younghee Alert: RSI(${rsi.toFixed(2)})<30, 종가(${currentClose.toFixed(2)})<EMA(${ema.toFixed(2)}), 거래량(${currentVolume}) < ${(volMa * 0.8).toFixed(2)}`,
        });
      }
    });
    return alerts;
  }, [chartData]);
};

const theme = createTheme({
  palette: {
    primary: { main: '#1976d2' },
    warning: { main: '#ff9800' },
    info: { main: '#2196f3' },
    error: { main: '#ff0000' },
  },
  typography: {
    fontFamily: 'Roboto, Arial, sans-serif',
  },
});

function DailyAnalysisTab() {
  // 종목 및 기간 state
  const [selectedSymbol, setSelectedSymbol] = useState('BTCUSDT');
  const [selectedPeriod, setSelectedPeriod] = useState('1d');
  const handlePeriodChange = (e) => {
    setSelectedPeriod(e.target.value);
  };

  // 차트 데이터 및 CSV 업로드 훅
  const { chartData, loading: chartLoading } = useChartData(selectedSymbol, selectedPeriod);
  const {
    tradeData,
    signalScenarioData,
    loading: uploadLoading,
    fileName,
    tradeCount,
    handleFileUpload,
    dataQualityIssues,
    summaryStats,
  } = useSafeTradeUpload(selectedSymbol);
  const { analyzeMistakes, mistakeAnalysis } = useMistakeAnalysis(signalScenarioData, chartData);

  // Alert 계산
  const cheolsuAlerts = useCheolsuAlert(chartData);
  const youngheeAlerts = useYoungheeAlert(chartData);

  // 실수 패턴 요약 상태
  const [mistakeSummary, setMistakeSummary] = useState({
    fomoCount: 0,
    panicCount: 0,
    cheolsuCount: 0,
    youngheeCount: 0,
    totalMistakes: 0,
  });
  useEffect(() => {
    const newSummary = {
      fomoCount: 0,
      panicCount: 0,
      totalMistakes: 0,
      cheolsuCount: cheolsuAlerts.length,
      youngheeCount: youngheeAlerts.length,
    };

    if (analyzeMistakes) {
      const analysis = analyzeMistakes();
      if (analysis?.summary) {
        newSummary.fomoCount = analysis.summary.fomoCount || 0;
        newSummary.panicCount = analysis.summary.panicCount || 0;
        newSummary.totalMistakes = analysis.summary.totalMistakes || 0;
      }
    }
    setMistakeSummary(newSummary);
  }, [analyzeMistakes, cheolsuAlerts, youngheeAlerts]);

  const tradeDataRange = tradeData.length > 0 ? {
    start: new Date(tradeData[0]['Date(UTC)']).toLocaleDateString('ko-KR'),
    end: new Date(tradeData[tradeData.length - 1]['Date(UTC)']).toLocaleDateString('ko-KR'),
  } : null;

  useEffect(() => {
    if (chartData.length > 0) {
      const chartStart = new Date(chartData[0].time);
      const chartEnd = new Date(chartData[chartData.length - 1].time);
      console.log(`Chart data range: ${chartStart} to ${chartEnd}`);
    }
    if (tradeData.length > 0) {
      const tradeStart = new Date(tradeData[0]['Date(UTC)']);
      const tradeEnd = new Date(tradeData[tradeData.length - 1]['Date(UTC)']);
      console.log(`Trade data range: ${tradeStart} to ${tradeEnd}`);
    }
  }, [chartData, tradeData]);

  // 종목 변경 핸들러
  const handleSymbolChange = (e) => {
    setSelectedSymbol(e.target.value);
  };

  // 차트 Trace 설정
  const candlestickTrace = chartData.length > 0 ? {
    x: chartData.map(d => d.time),
    open: chartData.map(d => d.open),
    high: chartData.map(d => d.high),
    low: chartData.map(d => d.low),
    close: chartData.map(d => d.close),
    type: 'candlestick',
    name: selectedSymbol,
    increasing: { line: { color: '#4caf50' } },
    decreasing: { line: { color: '#f44336' } },
    hoverinfo: 'x+y+text',
    text: chartData.map(d => `종가: ${d.close}`),
  } : {
    x: [], open: [], high: [], low: [], close: [],
    type: 'candlestick',
    name: selectedSymbol,
  };

  const buyTrades = tradeData.filter(t => t.Side === 'BUY') || [];
  const sellTrades = tradeData.filter(t => t.Side === 'SELL') || [];
  const buySignals = signalScenarioData.filter(s => s.type === 'buy') || [];

  const buyTrace = {
    x: buyTrades.map(t => t['Date(UTC)']),
    y: buyTrades.map(t => t.Price),
    mode: 'markers',
    type: 'scatter',
    name: '내 매수',
    legendgroup: 'trades',
    hovertemplate: '<b>내 매수</b><br>%{x}<br>가격: %{y} USDT<extra></extra>',
    customdata: buyTrades.map(t => ({ executed: t.Executed, reason: t.Reason })),
    marker: { color: '#9C27B0', size: 15, symbol: 'triangle-up', opacity: 0.8 },
  };

  const sellTrace = {
    x: sellTrades.map(t => t['Date(UTC)']),
    y: sellTrades.map(t => t.Price),
    mode: 'markers',
    type: 'scatter',
    name: '내 매도',
    legendgroup: 'trades',
    hovertemplate: '<b>내 매도</b><br>%{x}<br>가격: %{y} USDT<extra></extra>',
    customdata: sellTrades.map(t => ({ executed: t.Executed, reason: t.Reason })),
    marker: { color: '#FF9800', size: 15, symbol: 'triangle-down', opacity: 0.8 },
  };

  // (주석 처리된 신호 및 실수 Trace들은 그대로 남김)
  const cheolsuAlertTrace = {
    x: cheolsuAlerts.map(a => a.date),
    y: cheolsuAlerts.map(a => a.price),
    mode: 'text',
    type: 'scatter',
    name: '철수 Alert',
    showlegend: false,
    text: cheolsuAlerts.map(() => '💣'),
    textfont: { size: 16},
    textposition: 'top center',
    hovertemplate: '<b>철수 Alert</b><br>%{x}<br>가격: %{y}<extra></extra>',
  };

  const youngheeAlertTrace = {
    x: youngheeAlerts.map(a => a.date),
    y: youngheeAlerts.map(a => a.price),
    mode: 'text',
    type: 'scatter',
    name: '영희 Alert',
    showlegend: false,
    text: youngheeAlerts.map(() => '💰'),
    textfont: { size: 16 },
    textposition: 'bottom center',
    hovertemplate: '<b>영희 Alert</b><br>%{x}<br>가격: %{y}<extra></extra>',
  };

  const maxPriceValue = chartData.length > 0 
    ? Math.max(...chartData.map(d => parseFloat(d.high) || 0)) 
    : 0;

  const verticalAlertShapes = [
    ...cheolsuAlerts.map(alert => ({
      type: 'line',
      xref: 'x',
      yref: 'y',
      x0: alert.date,
      x1: alert.date,
      y0: 0,
      y1: maxPriceValue,
      line: { color: 'rgba(255, 0, 0, 0.1)', width: 2 },
      layer: 'below'
    })),
    ...youngheeAlerts.map(alert => ({
      type: 'line',
      xref: 'x',
      yref: 'y',
      x0: alert.date,
      x1: alert.date,
      y0: 0,
      y1: maxPriceValue,
      line: { color: 'rgba(0, 0, 255, 0.1)', width: 2 },
      layer: 'below'
    })),
  ];

  // ★ useGptAnalysis 훅을 사용하여 GPT 분석 관련 상태 및 함수 호출
  const {
    analysisResult,
    analysisLoading,
    analysisError,
    fetchAnalysis,
  } = useGptAnalysis();

  // GPT 분석 실행 핸들러: tradeData, summaryStats, signalScenarioData를 인자로 전달
  const handleGptAnalysis = () => {
    console.log('✅ GPT 분석 버튼 클릭됨');
  
    // 1. 시간대별 거래 분포 계산 (0~23시)
    const timeDistribution = new Array(24).fill(0);
    if (Array.isArray(tradeData) && tradeData.length > 0) {
      tradeData.forEach((transaction) => {
        const date = new Date(transaction['Date(UTC)']);
        const hour = date.getHours();
        timeDistribution[hour] += 1;
      });
    }
  
    // 2. 매수-매도 페어별 보유시간 및 손익 데이터 생성
    const pairHoldTimeData = Array.isArray(signalScenarioData)
      ? signalScenarioData.map((entry) => ({
          pair: entry.pair,
          holdingTime: `${Math.floor(entry.holdMinutes / 60)}시간 ${entry.holdMinutes % 60}분`,
          buyPrice: entry.buyPrice,
          sellPrice: entry.sellPrice,
          pnl: entry.pnl >= 0 ? `+${entry.pnl}` : entry.pnl.toString(),
        }))
      : [];
  
    // ✅ 3. 평균 보유 일 수 계산해서 summaryStats에 추가
    const avgHoldDays = signalScenarioData.length > 0
      ? signalScenarioData.reduce((sum, t) => sum + t.holdDays, 0) / signalScenarioData.length
      : 0;
    summaryStats.avgHoldDays = avgHoldDays;
  
    // 4. 기타 프롬프트 변수 계산
    const mostLossHour = timeDistribution.indexOf(Math.max(...timeDistribution));
    const volatility = 3.2; // 계산 방식 변경 가능
    const recentTrend = '관심 증가'; // Supabase 연동 가능
    const m2ChangeRate = 1.1; // M2 API 연동 가능
  
    // 5. fetchAnalysis 호출
    fetchAnalysis({
      tradeData,
      summaryStats,
      signalScenarioData,
      timeDistribution,
      pairHoldTimeData,
      fomoCount: mistakeSummary.fomoCount,
      panicCount: mistakeSummary.panicCount,
      mostLossHour,
      symbol: selectedSymbol,
      volatility,
      recentTrend,
      m2ChangeRate,
    });
  };
  
  

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <PageLayout title={`🔍 ${selectedSymbol} 거래 분석`}
        subtitle={`개인 매매 데이터를 기반으로 패턴을 분석하고 매수·매도 시점에 대한 인사이트를 제공합니다.`}
        subtitle2='리스크 관리를 위한 참고 지표이며, 절대적인 매매 시그널은 아닙니다.'
      >
        <Box style={{display: 'flex', justifyContent: 'center'}}>
          <ul style={{listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.8125rem', backgroundColor: 'rgba(255, 233, 213, 0.65)', padding: '1rem 1.5rem', borderRadius: '0.75rem'}}>
            <li>💣 <span style={{fontWeight: 'bold', paddingRight: '8px', fontSize: '0.875rem'}}>철수 Alert 란?</span> '지금은 조심할 타이밍일 수 있어요' 라는 신호입니다. 과열된 구간에서 매도 타이밍을 고민할 수 있도록 도와줍니다.</li>
            <li>💰 <span style={{fontWeight: 'bold', paddingRight: '8px', fontSize: '0.875rem'}}>영희 Alert 란?</span> '조용하지만 주목할 시점' 을 뜻합니다. 시장 관심이 줄어든 저점에서 기회를 포착할 수 있도록 도와줍니다.</li>
            <li>📈 <span style={{fontWeight: 'bold', paddingRight: '8px', fontSize: '0.875rem'}}>BTCUSDT 캔들 차트</span>는 실시간으로 업데이트가 되고 있습니다.</li>
          </ul>
        </Box>
        <Box className="personal-page-container">
          {/* 종목 선택 및 CSV 업로드 컨트롤 */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 2, mt: 3 }}>
            <UploadControls
              selectedSymbol={selectedSymbol}
              handleSymbolChange={handleSymbolChange}
              selectedPeriod={selectedPeriod}
              handlePeriodChange={handlePeriodChange}
              loading={uploadLoading || chartLoading}
              fileName={fileName}
              tradeCount={tradeCount}
              handleFileUpload={handleFileUpload}
            />
          </Box>

          {/* 데이터 품질 문제 안내 */}
          {dataQualityIssues.length > 0 && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              <Typography variant="body1">데이터 품질 문제:</Typography>
              <List dense>
                {dataQualityIssues.map((issue, idx) => (
                  <ListItem key={idx}>
                    <ListItemText primary={`행 ${issue.row}: ${issue.issue}`} />
                  </ListItem>
                ))}
              </List>
            </Alert>
          )}

          {/* TradeLegend */}
          <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'center' }}>
            <TradeLegend />
          </Box>

          {/* 차트 표시 */}
          <Plot
            data={[
              candlestickTrace,
              buyTrace,
              sellTrace,
              // buySignalTrace, sellSignalTrace, mistakeTrace: 기존 주석 처리된 부분은 그대로 유지
              cheolsuAlertTrace,
              youngheeAlertTrace,
            ].filter(trace => trace.x && trace.x.length > 0)}
            layout={{
              // title: `${selectedSymbol} (${selectedPeriod}) 캔들 차트 (실시간 업데이트)`,
              xaxis: { type: 'date', autorange: true },
              yaxis: { title: '가격 (USDT)', autorange: true },
              dragmode: 'zoom',
              autosize: true,
              margin: { t: 0, b: 50, l: 50, r: 30 },
              template: 'plotly_dark',
              showlegend: false,
              hovermode: 'x unified',
              shapes: verticalAlertShapes,
            }}
            config={{ scrollZoom: true, responsive: true }}
            className="plot-container"
          />

          {/* InsightsPanel: 손익 요약 Accordion 및 추가된 GPT 분석 인사이트 Accordion */}
          {signalScenarioData.length > 0 && (
            <InsightsPanel
              signalScenarioData={signalScenarioData}
              chartData={chartData}
              dataQualityIssues={dataQualityIssues}
              tradeDataRange={tradeDataRange}
              summaryStats={summaryStats}  // 기존 손익 요약 및 통계 정보
              // ★ GPT 분석 관련 props 전달
              gptAnalysisResult={analysisResult}
              analysisLoading={analysisLoading}
              analysisError={analysisError}
              handleGptAnalysis={handleGptAnalysis}
            />
          )}
        </Box>
      </PageLayout>
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} />
    </ThemeProvider>
  );
}

export default DailyAnalysisTab;
