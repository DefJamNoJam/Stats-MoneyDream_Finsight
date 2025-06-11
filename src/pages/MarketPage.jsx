import React, { useEffect, useState, useRef } from 'react';
import Plot from 'react-plotly.js';
import axios from 'axios';
import {
  Box,
  Checkbox,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Grid,
  TextField,
  Button
} from '@mui/material';
import PageLayout from '../components/PageLayout';
import { fetchGoogleTrends } from '../google-trends/fetchTrendData';
import AnalysisModal from '../components/AnalysisModal';
import Tooltip from '@mui/material/Tooltip';

function MarketPage() {
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [interval, setInterval] = useState('1w');
  const [ohlcvData, setOhlcvData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [m2Data, setM2Data] = useState([]);
  const [dateRange, setDateRange] = useState([null, null]);
  const [showEMA, setShowEMA] = useState(false);
  const [showMACD, setShowMACD] = useState(false);
  const [showRSI, setShowRSI] = useState(false);
  const [showBollinger, setShowBollinger] = useState(false);
  const [googleTrendData, setGoogleTrendData] = useState([]);
  const [hoveredTrace, setHoveredTrace] = useState(null);
  const [openAnalysis, setOpenAnalysis] = useState(false);
  const [isDataReady, setIsDataReady] = useState(false);
  const fetchTimeoutRef = useRef(null);

  // Technical indicator functions (unchanged)
  const calculateEMA = (data, period = 20) => {
    if (data.length === 0) return [];
    const k = 2 / (period + 1);
    let emaArray = [];
    let prevEma = data[0].close;
    data.forEach((d, i) => {
      const ema = i === 0 ? d.close : d.close * k + prevEma * (1 - k);
      emaArray.push({ time: d.time, ema });
      prevEma = ema;
    });
    return emaArray;
  };

  const calculateRSI = (data, period = 14) => {
    if (data.length < period + 1) {
      return data.map(d => ({ time: d.time, rsi: null }));
    }
    let gains = 0, losses = 0;
    for (let i = 1; i <= period; i++) {
      const change = data[i].close - data[i - 1].close;
      if (change >= 0) gains += change;
      else losses -= change;
    }
    let avgGain = gains / period;
    let avgLoss = losses / period;
    let rs = avgGain / (avgLoss || 1);

    const rsiArray = data.map(d => ({ time: d.time, rsi: null }));
    rsiArray[period].rsi = 100 - 100 / (1 + rs);

    for (let i = period + 1; i < data.length; i++) {
      const change = data[i].close - data[i - 1].close;
      if (change >= 0) {
        avgGain = (avgGain * (period - 1) + change) / period;
        avgLoss = (avgLoss * (period - 1)) / period;
      } else {
        avgLoss = (avgLoss * (period - 1) - change) / period;
        avgGain = (avgGain * (period - 1)) / period;
      }
      rs = avgGain / (avgLoss || 1);
      rsiArray[i].rsi = 100 - 100 / (1 + rs);
    }
    return rsiArray;
  };

  const calculateMACD = (data, shortPeriod = 12, longPeriod = 26, signalPeriod = 9) => {
    const emaShort = calculateEMA(data, shortPeriod).map(d => d.ema);
    const emaLong = calculateEMA(data, longPeriod).map(d => d.ema);
    const macdLine = emaShort.map((val, i) => val - (emaLong[i] || 0));
    const macdData = macdLine.map((m, i) => ({ time: data[i].time, macd: m }));
    const signalLine = calculateEMA(macdData, signalPeriod).map(d => d.ema);

    return macdLine.map((m, i) => ({
      time: data[i].time,
      macd: m,
      signal: signalLine[i] || null
    }));
  };

  const calculateBollingerBands = (data, period = 20, multiplier = 2) => {
    const bands = [];
    for (let i = 0; i < data.length; i++) {
      if (i < period) {
        bands.push({ time: data[i].time, upper: null, lower: null });
        continue;
      }
      const slice = data.slice(i - period, i);
      const avg = slice.reduce((sum, d) => sum + d.close, 0) / period;
      const std = Math.sqrt(slice.reduce((acc, d) => acc + Math.pow(d.close - avg, 2), 0) / period);
      bands.push({
        time: data[i].time,
        upper: avg + multiplier * std,
        lower: avg - multiplier * std
      });
    }
    return bands;
  };

  // Fetch functions (unchanged)
  const getKlinesUrl = (symbol, interval, limit) =>
    `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;

  const fetchOHLCV = async () => {
    try {
      const limit = 1000;
      const url = getKlinesUrl(symbol, interval, limit);
      const response = await axios.get(url);
      const formatted = response.data.map(item => ({
        time: new Date(item[0]),
        open: parseFloat(item[1]),
        high: parseFloat(item[2]),
        low: parseFloat(item[3]),
        close: parseFloat(item[4]),
        volume: parseFloat(item[5])
      }));
      setOhlcvData(formatted);
    } catch (err) {
      console.error('Binance API error:', err);
    }
  };

  const fetchM2Data = async () => {
    try {
      const response = await axios.get('http://127.0.0.1:8000/api/m2');
      const dates = response.data.dates.map(date => new Date(date));
      const values = response.data.values;
      const formatted = dates.map((d, i) => ({ date: d, value: values[i] }));
      setM2Data(formatted);
    } catch (err) {
      console.error('M2 API fetch error:', err);
    }
  };

  // Google Trends fetch (unchanged)
  useEffect(() => {
    if (dateRange[0] && dateRange[1]) {
      const getTrendData = async () => {
        try {
          const usedGranularity = interval === '1w' ? 'monthly' : 'weekly';
          const startDate = dateRange[0];
          const endDate = dateRange[1];
          const keyword = symbol === 'ETHUSDT' ? 'ethereum' : 'bitcoin';

          const trendData = await fetchGoogleTrends(keyword, usedGranularity, startDate, endDate);
          setGoogleTrendData(trendData);
        } catch (error) {
          console.error('Trend data fetch error:', error);
          setGoogleTrendData([]);
        }
      };
      getTrendData();
    }
  }, [symbol, interval, dateRange]);

  // Debounced data fetching (unchanged)
  useEffect(() => {
    if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
    fetchTimeoutRef.current = setTimeout(() => {
      fetchOHLCV();
      fetchM2Data();
    }, 400);
    return () => clearTimeout(fetchTimeoutRef.current);
  }, [symbol, interval]);

  // Set date range (unchanged)
  useEffect(() => {
    if (ohlcvData.length > 0) {
      const times = ohlcvData.map(d => d.time);
      const minDate = new Date(Math.min(...times));
      const maxDate = new Date(Math.max(...times));
      setDateRange([
        minDate.toISOString().split('T')[0],
        maxDate.toISOString().split('T')[0]
      ]);
    }
  }, [ohlcvData]);

  // Filter OHLCV data (unchanged)
  useEffect(() => {
    if (dateRange[0] && dateRange[1]) {
      const start = new Date(dateRange[0]);
      const end = new Date(dateRange[1]);
      const filtered = ohlcvData.filter(d => d.time >= start && d.time <= end);
      setFilteredData(filtered);
    }
  }, [dateRange, ohlcvData]);

  // Check data readiness (unchanged)
  useEffect(() => {
    if (filteredData.length > 0 && googleTrendData.length > 0 && m2Data.length > 0) {
      setIsDataReady(true);
    } else {
      setIsDataReady(false);
    }
  }, [filteredData, googleTrendData, m2Data]);

  // Handlers (unchanged)
  const handleSymbolChange = (e) => setSymbol(e.target.value);
  const handleIntervalChange = (e) => setInterval(e.target.value);
  const handleShowEMAChange = (e) => setShowEMA(e.target.checked);
  const handleShowMACDChange = (e) => setShowMACD(e.target.checked);
  const handleShowRSIChange = (e) => setShowRSI(e.target.checked);
  const handleShowBollingerChange = (e) => setShowBollinger(e.target.checked);
  const handleLegendEnter = (traceName) => setHoveredTrace(traceName);
  const handleLegendLeave = () => setHoveredTrace(null);

  const indicatorOptions = [
    {
      label: 'EMA 20',
      tooltip: '20일 지수 이동 평균으로 단기 추세를 파악합니다.',
      checked: showEMA,
      onChange: handleShowEMAChange,
    },
    {
      label: 'MACD',
      tooltip: '장단기 이동평균선 간 차이를 이용해 추세 전환 시점을 포착합니다.',
      checked: showMACD,
      onChange: handleShowMACDChange,
    },
    {
      label: 'RSI 14',
      tooltip: '14일 상대강도지수로 과매수/과매도 여부를 판단합니다.',
      checked: showRSI,
      onChange: handleShowRSIChange,
    },
    {
      label: '볼린저 밴드',
      tooltip: '가격의 표준편차 범위를 시각화하여 과열/침체 구간을 파악합니다.',
      checked: showBollinger,
      onChange: handleShowBollingerChange,
    },
  ];

  // Calculate domains for y-axes
  const calculateDomains = () => {
    const mainBottom = 0.15;
    const mainTop = 1;
    const gap = 0.05;
  
    let rowCount = 2; // volume + m2 (기본)
    if (showRSI) rowCount++;
    if (showMACD) rowCount++;
  
    const mainHeight = 0.4; // 📌 메인 차트 고정 크기
    const restHeight = mainTop - mainBottom - mainHeight - gap * (rowCount - 1);
    const rowHeight = restHeight / rowCount;
  
    let currentTop = mainTop;
  
    const domains = {};
  
    domains.price = [currentTop - mainHeight, currentTop]; // 📌 고정 높이
    currentTop = domains.price[0] - gap;
    domains.volume = [currentTop - rowHeight, currentTop];
    currentTop = domains.volume[0] - gap;
    domains.m2 = [currentTop - rowHeight, currentTop];
    currentTop = domains.m2[0] - gap;
  
    if (showRSI) {
      domains.rsi = [currentTop - rowHeight, currentTop];
      currentTop = domains.rsi[0] - gap;
    }
    if (showMACD) {
      domains.macd = [currentTop - rowHeight, currentTop];
    }
  
    return domains;
  };

  const filteredM2Data = m2Data.filter(d => {
    const date = new Date(d.date);
    return (
      date >= new Date(dateRange[0]) && date <= new Date(dateRange[1])
    );
  });  

  const domains = calculateDomains();

  // Main chart traces
  let mainTraces = [];
  if (filteredData.length > 0) {
    // Price candlestick for main chart
    mainTraces.push({
      x: filteredData.map(d => d.time),
      close: filteredData.map(d => d.close),
      open: filteredData.map(d => d.open),
      high: filteredData.map(d => d.high),
      low: filteredData.map(d => d.low),
      type: 'candlestick',
      name: "Price",
      xaxis: 'x',
      yaxis: 'y'
    });
    if (showEMA) {
      const ema = calculateEMA(filteredData, 20);
      mainTraces.push({
        x: ema.map(e => e.time),
        y: ema.map(e => e.ema),
        type: 'scatter',
        mode: 'lines',
        name: 'EMA 20',
        line: { color: '#FFA000', width: 1.8 }, // 진한 오렌지
        xaxis: 'x',
        yaxis: 'y'
      });
    }
    
    // Volume chart
    mainTraces.push({
      x: filteredData.map(d => d.time),
      y: filteredData.map(d => d.volume),
      type: 'bar',
      name: '거래량',
      marker: { color: '#BDBDBD' },
      xaxis: 'x',
      yaxis: 'y3'
    });
    
    // M2 Money Supply
    if (filteredM2Data.length > 0) {
      mainTraces.push({
        x: filteredM2Data.map(d => d.date),
        y: filteredM2Data.map(d => d.value),
        type: 'scatter',
        mode: 'lines',
        name: 'M2 통화량',
        line: { color: '#009688', width: 2.5 }, // 청록 + 강조
        xaxis: 'x',
        yaxis: 'y4'
      });
    }
    
    // RSI
    if (showRSI) {
      const rsi = calculateRSI(filteredData, 14);
      mainTraces.push({
        x: rsi.map(d => d.time),
        y: rsi.map(d => d.rsi),
        type: 'scatter',
        mode: 'lines',
        name: 'RSI 14',
        line: { color: '#1565C0', width: 1.5 }, // 짙은 파랑
        xaxis: 'x',
        yaxis: 'y5',
      });
    }
    
    // MACD
    if (showMACD) {
      const macdCalc = calculateMACD(filteredData, 12, 26, 9);
      mainTraces.push({
        x: macdCalc.map(d => d.time),
        y: macdCalc.map(d => d.macd),
        type: 'scatter',
        mode: 'lines',
        name: 'MACD',
        line: { color: '#43A047', width: 1.8 }, // 연한 초록
        xaxis: 'x',
        yaxis: 'y6'
      });
      mainTraces.push({
        x: macdCalc.map(d => d.time),
        y: macdCalc.map(d => d.signal),
        type: 'scatter',
        mode: 'lines',
        name: 'Signal',
        line: { color: '#EF5350', width: 1.2 }, // 연한 빨강
        xaxis: 'x',
        yaxis: 'y6'
      });
    }
    
    // Bollinger Bands
    if (showBollinger) {
      const bands = calculateBollingerBands(filteredData, 20, 2);
      mainTraces.push({
        x: bands.map(d => d.time),
        y: bands.map(d => d.upper),
        type: 'scatter',
        mode: 'lines',
        name: 'Upper Band',
        line: { dash: 'dot', color: '#7E57C2', width: 1.2 }, // 보라색 점선
        xaxis: 'x',
        yaxis: 'y'
      });
      mainTraces.push({
        x: bands.map(d => d.time),
        y: bands.map(d => d.lower),
        type: 'scatter',
        mode: 'lines',
        name: 'Lower Band',
        line: { dash: 'dot', color: '#7E57C2', width: 1.2 },
        xaxis: 'x',
        yaxis: 'y'
      });
    }
    
    // Google Trend
    if (googleTrendData.length > 0) {
      mainTraces.push({
        x: googleTrendData.map(row => new Date(row.date)),
        y: googleTrendData.map(row => parseFloat(row.value)),
        type: 'scatter',
        mode: 'lines',
        name: 'Google Trend',
        line: { color: '#9C27B0', width: 2.8 }, // 진보라 + 강조
        xaxis: 'x',
        yaxis: 'y2'
      });
    }
    

    // Price candlestick for range slider
    // mainTraces.push({
    //   x: filteredData.map(d => d.time),
    //   close: filteredData.map(d => d.close),
    //   open: filteredData.map(d => d.open),
    //   high: filteredData.map(d => d.high),
    //   low: filteredData.map(d => d.low),
    //   type: 'candlestick',
    //   name: "Price (Range Slider)",
    //   xaxis: 'x2',
    //   yaxis: 'y7', // Note: Changed to 'y7' to avoid conflict
    //   showlegend: false
    // });
  }

  const dynamicNames = ["Price", "Google Trend"];
  const dynamicTraces = mainTraces
    .filter(t => dynamicNames.includes(t.name))
    .map(t => ({
      ...t,
      opacity: hoveredTrace ? (t.name === hoveredTrace ? 1 : 0.3) : 1
    }));
  const staticTraces = mainTraces.filter(t => !dynamicNames.includes(t.name));
  const finalTraces = [...dynamicTraces, ...staticTraces];

  // Layout configuration
  let rowCount = 3; // Price, Volume, M2
  if (showRSI) rowCount++;
  if (showMACD) rowCount++;

  const layout = {
    // title: { text: '메인 차트 + 구글 트렌드', x: 0.02, y: 0.95 },
    // grid: { rows: rowCount + 1, columns: 1, pattern: 'independent' },
    grid: {
      rows: rowCount, // ✅ rowCount + 1 ❌ (range slider는 grid에 포함 안 시킴)
      columns: 1,
      pattern: 'independent'
    },
    height: 900, // Increased to accommodate range slider
    xaxis: {
      domain: [0, 1],
      automargin: true,
      // matches: 'x2', // Sync with range slider x-axis
      // rangemode : 'auto'
      type: 'date'
    },
    xaxis2: {
      domain: [0, 1],
      rangeslider: { visible: true, thickness: 0.1 },
      showticklabels: false,
      type: 'date',
      anchor: 'y7',  // ✅ yaxis7에 연결
      fixedrange: true // 🔒 줌 방지
    },    
    yaxis: {
      domain: domains.price,
      title: '가격',
      automargin: true
    },
    yaxis2: {
      domain: domains.price,
      title: '구글 트렌드',
      overlaying: 'y',
      side: 'right'
    },
    yaxis3: {
      domain: domains.volume,
      title: '거래량',
      automargin: true
    },
    yaxis4: {
      domain: domains.m2,
      title: 'M2 통화량',
      automargin: true,
    },
    yaxis7: {
      domain: [0, 0.12],  // ✅ 아래쪽 작게 차지
      visible: false,
      anchor: 'x2'
    },    
    hovermode: 'x unified',
    margin: { t: 60, b: 100, l: 60, r: 60 },
    legend: {
      orientation: "h",
      xanchor: "center",
      yanchor: "bottom",
      y: 1.02, // Moved to top
      x: 0.5
    }
  };

  const allTimes = ohlcvData.map(d => d.time);
  if (allTimes.length > 0) {
    layout.xaxis.range = [
      new Date(Math.min(...allTimes)),
      new Date(Math.max(...allTimes))
    ];
  }

  if (showRSI) {
    layout.yaxis5 = {
      domain: domains.rsi,
      title: 'RSI',
      automargin: true,
      range: [0, 100],
      tickvals: [0, 30, 50, 70, 100],
      ticktext: ['0', '30', '50', '70', '100']
    };
  }

  if (showMACD) {
    layout.yaxis6 = {
      domain: domains.macd,
      title: 'MACD',
      automargin: true
    };
  }

  
  return (
    <PageLayout
      title="메인 차트 + 구글 트렌드"
      subtitle="실시간 가격과 시장 심리를 한눈에!"
    >
      {/* 필터 영역 */}
      <Grid container spacing={2} alignItems="center" sx={{
        mt: 4,
        mb: 2,
        px: 2,
        py: 2,
        backgroundColor: '#f9fbfd',
        borderRadius: 2,
        border: '1px solid #e0e0e0'
      }}>
        <Grid item>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel id="symbol-label">종목</InputLabel>
            <Select labelId="symbol-label" value={symbol} onChange={(e) => setSymbol(e.target.value)} label="종목">
              <MenuItem value="BTCUSDT">BTC/USDT</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel id="interval-label">간격</InputLabel>
            <Select labelId="interval-label" value={interval} onChange={(e) => setInterval(e.target.value)} label="간격">
            <MenuItem value="1m">1분</MenuItem>
              <MenuItem value="3m">3분</MenuItem>
              <MenuItem value="5m">5분</MenuItem>
              <MenuItem value="15m">15분</MenuItem>
              <MenuItem value="30m">30분</MenuItem>
              <MenuItem value="1h">1시간</MenuItem>
              <MenuItem value="2h">2시간</MenuItem>
              <MenuItem value="4h">4시간</MenuItem>
              <MenuItem value="6h">6시간</MenuItem>
              <MenuItem value="12h">12시간</MenuItem>
              <MenuItem value="1d">1일</MenuItem>
              <MenuItem value="1w">1주</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item>
          <TextField
            label="시작 날짜"
            type="date"
            InputLabelProps={{ shrink: true }}
            size="small"
            value={dateRange[0] || ''}
            onChange={(e) => setDateRange([e.target.value, dateRange[1]])}
          />
        </Grid>
        <Grid item>
          <TextField
            label="종료 날짜"
            type="date"
            InputLabelProps={{ shrink: true }}
            size="small"
            value={dateRange[1] || ''}
            onChange={(e) => setDateRange([dateRange[0], e.target.value])}
          />
        </Grid>
        <Grid item sx={{ ml: 'auto', display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {indicatorOptions.map((option) => (
            <Tooltip key={option.label} title={option.tooltip} arrow placement="top">
              <FormControlLabel
                control={
                  <Checkbox
                    checked={option.checked}
                    onChange={option.onChange}
                    size="small"
                  />
                }
                label={<span style={{ fontSize: '0.9rem' }}>{option.label}</span>}
              />
            </Tooltip>
          ))}
        </Grid>
      </Grid>

      {/* custom 범례 */}
      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center', mt: 3 }}>
        <Box
          onMouseEnter={() => setHoveredTrace("Price")}
          onMouseLeave={() => setHoveredTrace(null)}
          sx={{
            px: 2,
            py: 1,
            borderRadius: 2,
            // border: '1px solid #ddd',
            cursor: 'pointer',
            backgroundColor: hoveredTrace === "Price" ? '#e3f2fd' : '#f5f5f5',
            fontWeight: hoveredTrace === "Price" ? 600 : 400,
            transition: '0.2s'
          }}
        >
          📈 Price
        </Box>
        <Box
          onMouseEnter={() => setHoveredTrace("Google Trend")}
          onMouseLeave={() => setHoveredTrace(null)}
          sx={{
            px: 2,
            py: 1,
            borderRadius: 2,
            // border: '1px solid #ddd',
            cursor: 'pointer',
            backgroundColor: hoveredTrace === "Google Trend" ? '#e3f2fd' : '#f5f5f5',
            fontWeight: hoveredTrace === "Google Trend" ? 600 : 400,
            transition: '0.2s'
          }}
        >
          🔍 Google Trend
        </Box>
      </Box>


      {/* Plot 영역 */}
      <Box sx={{ position: 'relative', mb: 10, mt: 2 }}>
      <Plot
        data={finalTraces}
        layout={layout}
        config={{
          scrollZoom: true,
          modeBarButtonsToRemove: ['autoScale2d', 'lasso2d', 'select2d']
        }}
        // onHover={(event) => {
        //   const traceName = event.points?.[0]?.data?.name;
        //   if (traceName === 'Price' || traceName === 'Google Trend') {
        //     setHoveredTrace(traceName);
        //   } else {
        //     setHoveredTrace(null);
        //   }
        // }}
        // onUnhover={() => setHoveredTrace(null)}
        style={{ width: '100%' }}
      />

      </Box>

      {/* 분석 버튼 */}
      <Box sx={{ textAlign: 'center', mt: 30, mb: 6 }}>
        <Button
          variant="contained"
          onClick={() => setOpenAnalysis(true)}
          disabled={!isDataReady}
          sx={{
            py: 1.4,
            px: 4,
            fontWeight: 600,
            fontSize: '1rem',
            borderRadius: '8px',
            backgroundColor: isDataReady ? '#4FA3FF' : '#ccc',
            color: isDataReady ? '#fff' : '#666',
            '&:hover': {
              backgroundColor: isDataReady ? '#6EBBFF' : '#ccc',
            }
          }}
        >
          전체 분석 보기
        </Button>
      </Box>

      <AnalysisModal
        open={openAnalysis}
        onClose={() => setOpenAnalysis(false)}
        filteredData={filteredData}
        googleTrendData={googleTrendData}
        m2Data={m2Data}
        symbol={symbol}
      />
    </PageLayout>
  );
}

export default MarketPage;