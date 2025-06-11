// src/pages/OneMinutePredictionTab.jsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import Plot from 'react-plotly.js';
import { Box, CssBaseline } from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import PageLayout from '../components/PageLayout';
import { useMinuteChartData } from '../hooks/useMinuteChartData';
import { useLSTMPrediction } from '../hooks/useLSTMPrediction';

import '../utils/PersonalPage.css';

const theme = createTheme({
  palette: { primary: { main: '#1976d2' } },
});

function OneMinutePredictionTab() {
  const [selectedSymbol] = useState('BTCUSDT');
  const { chartData } = useMinuteChartData(selectedSymbol);
  const { stopLoss, takeProfit } = useLSTMPrediction(selectedSymbol);

  const [historicalBands, setHistoricalBands] = useState([]);
  const lastPredictionTimeRef = useRef(null);
  const prevStopLossRef = useRef(null);
  const prevTakeProfitRef = useRef(null);

  // ✅ 사용자가 줌한 범위 저장 (x/y 범위)
  const userZoomRef = useRef(null);

  useEffect(() => {
    if (chartData.length > 0 && stopLoss != null && takeProfit != null) {
      const currentTime = chartData[chartData.length - 1].time;

      if (lastPredictionTimeRef.current && currentTime > lastPredictionTimeRef.current) {
        const prevTime = lastPredictionTimeRef.current;
        const bandStart = new Date(prevTime.getTime() - 1 * 60 * 1000);

        const newBand = {
          x0: bandStart,
          x1: prevTime,
          y0: prevStopLossRef.current,
          y1: prevTakeProfitRef.current,
          timestamp: Date.now(),
        };

        if (prevTime < currentTime) {
          setHistoricalBands(prev => [...prev, newBand]);
        }
      }

      lastPredictionTimeRef.current = currentTime;
      prevStopLossRef.current = stopLoss;
      prevTakeProfitRef.current = takeProfit;
    }
  }, [stopLoss, takeProfit, chartData]);

  const historicalBandShapes = useMemo(() => {
    const fadeFactor = 0.02;
    const startingAlpha = 0.6;

    return historicalBands.map((band) => {
      const ageInMinutes = (Date.now() - band.timestamp) / 60000;
      const alpha = Math.max(0.1, startingAlpha - ageInMinutes * fadeFactor);

      return {
        type: 'rect',
        xref: 'x',
        yref: 'y',
        x0: band.x0,
        x1: band.x1,
        y0: band.y0,
        y1: band.y1,
        fillcolor: `rgba(0,128,255,${alpha})`,
        line: { width: 0 },
        layer: 'below',
      };
    });
  }, [historicalBands]);

  const mainBandShape = useMemo(() => {
    if (!stopLoss || !takeProfit || chartData.length === 0) return null;

    const lastTime = chartData[chartData.length - 1].time;
    const futureTime = new Date(lastTime.getTime() + 5 * 60 * 1000);

    return {
      type: 'rect',
      xref: 'x',
      yref: 'y',
      x0: lastTime,
      x1: futureTime,
      y0: stopLoss,
      y1: takeProfit,
      fillcolor: 'rgba(0,128,255,0.6)',
      line: { width: 0 },
      layer: 'below',
    };
  }, [chartData, stopLoss, takeProfit]);

  const candlestickTrace = {
    x: chartData.map(d => d.time),
    open: chartData.map(d => d.open),
    high: chartData.map(d => d.high),
    low: chartData.map(d => d.low),
    close: chartData.map(d => d.close),
    type: 'candlestick',
    name: 'BTCUSDT',
    legendgroup: 'base',
    line: { width: 2 },
    increasing: { line: { color: '#4caf50' } },
    decreasing: { line: { color: '#f44336' } },
  };

  let predictedUpperTrace = null;
  let predictedLowerTrace = null;
  let annotations = [];

  if (chartData.length > 0 && stopLoss != null && takeProfit != null) {
    const lastTime = chartData[chartData.length - 1].time;
    const futureTime = new Date(lastTime.getTime() + 5 * 60 * 1000);

    predictedUpperTrace = {
      x: [lastTime, futureTime],
      y: [takeProfit, takeProfit],
      mode: 'lines',
      name: 'Predicted Upper',
      legendgroup: 'predict',
      line: { color: 'green', width: 2 },
    };

    predictedLowerTrace = {
      x: [lastTime, futureTime],
      y: [stopLoss, stopLoss],
      mode: 'lines',
      name: 'Predicted Lower',
      legendgroup: 'predict',
      line: { color: 'red', width: 2 },
    };

    annotations = [
      {
        x: futureTime,
        y: takeProfit,
        xref: 'x',
        yref: 'y',
        text: ' 예상 상한',
        showarrow: true,
        arrowhead: 2,
        arrowcolor: 'green',
        ax: 30,
        ay: 0,
        font: { color: 'green', size: 12 },
      },
      {
        x: futureTime,
        y: stopLoss,
        xref: 'x',
        yref: 'y',
        text: ' 예상 하한',
        showarrow: true,
        arrowhead: 2,
        arrowcolor: 'red',
        ax: 30,
        ay: 0,
        font: { color: 'red', size: 12 },
      }
    ];
  }

  const plotData = [
    candlestickTrace,
    predictedUpperTrace,
    predictedLowerTrace,
  ].filter(Boolean);

  const layout = {
    // title: `${selectedSymbol} 실시간 예측 밴드 (1분봉)`,
    xaxis: {
      // title: '시간',
      type: 'date',
      autorange: userZoomRef.current?.xaxis?.range ? false : true,
      range: userZoomRef.current?.xaxis?.range,
    },
    yaxis: {
      title: '가격 (USDT)',
      autorange: userZoomRef.current?.yaxis?.range ? false : true,
      range: userZoomRef.current?.yaxis?.range,
    },
    dragmode: 'zoom',
    autosize: true,
    template: 'plotly_dark',
    margin: { t: 10, b: 50, l: 50, r: 30 },
    showlegend: true,
    legend: {
      x: 0.5,
      y: 1.25,               // 📦 차트 바깥 위로 더 띄우기
      xanchor: 'center',
      orientation: 'h',
      font: { size: 11 },
      itemwidth: 70,
      itemclick: false,
    },  
    annotations,
    shapes: mainBandShape
      ? [...historicalBandShapes, mainBandShape]
      : historicalBandShapes,
  };

  useEffect(() => {
    console.log('LSTM prediction =>', { stopLoss, takeProfit, historicalBands });
  }, [stopLoss, takeProfit, historicalBands]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <PageLayout title={`⏱ ${selectedSymbol} 실시간 예측 밴드`} subtitle='1분 단위로 실시간 예측을 해드려요!'>
        <Box style={{display: 'flex', justifyContent: 'center'}}>
          <ul style={{listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.8125rem', backgroundColor: 'rgba(255, 233, 213, 0.65)', padding: '1rem 1.5rem', borderRadius: '0.75rem'}}>
            <li><span style={{fontWeight: 'bold', paddingRight: '8px', fontSize: '0.875rem', color: 'rgba(0,128,255,0.8)'}}>BLUEBAND ?!</span> 2017년부터의 1분봉 데이터를 학습한 LSTM 모델을 기반으로, 1분 뒤 캔들의 예상 상·하단 범위를 실시간 밴드 형태로 시각화합니다.</li>
            <li><span style={{fontWeight: 'bold', paddingRight: '97px', fontSize: '0.875rem'}}></span>예측 밴드는 1분마다 새로 그려져요. 직전 밴드는 잔상처럼 잠시 남아있게 돼요!</li>          
          </ul>
        </Box>
        <Box className="personal-page-container">
          <Plot
            data={plotData}
            layout={layout}
            config={{ scrollZoom: true, responsive: true }}
            className="plot-container"
            onRelayout={(event) => {
              if (event['xaxis.range[0]'] && event['xaxis.range[1]']) {
                userZoomRef.current = {
                  xaxis: {
                    range: [event['xaxis.range[0]'], event['xaxis.range[1]']],
                  },
                  yaxis: event['yaxis.range[0]'] && event['yaxis.range[1]']
                    ? {
                        range: [event['yaxis.range[0]'], event['yaxis.range[1]']],
                      }
                    : undefined,
                };
              }
            }}
          />
        </Box>
      </PageLayout>
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} />
    </ThemeProvider>
  );
}

export default OneMinutePredictionTab;
