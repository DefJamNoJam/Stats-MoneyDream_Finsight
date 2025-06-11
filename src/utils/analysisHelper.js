export const calculateVolatility = (data, window = 14) => {
    if (data.length < window) return 0;
    const closes = data.slice(-window).map(d => d.close);
    const mean = closes.reduce((a, b) => a + b, 0) / window;
    const std = Math.sqrt(closes.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / window);
    return (std / mean) * 100;
  };
  
  export const calculateTrendDescription = (trendData) => {
    if (!trendData || trendData.length < 2) return '데이터 부족';
    const recent = trendData.slice(-7);
    const start = recent[0].value;
    const end = recent[recent.length - 1].value;
    const change = ((end - start) / (start || 1)) * 100;
    if (change > 30) return '급등 중';
    if (change < -30) return '급락 중';
    if (change > 10) return '완만한 상승';
    if (change < -10) return '완만한 하락';
    return '변동 없음';
  };
  
  export const calculateM2Change = (m2Data) => {
    if (!m2Data || m2Data.length < 2) return 0;
    const sorted = [...m2Data].sort((a, b) => new Date(a.date) - new Date(b.date));
    const latest = sorted[sorted.length - 1].value;
    const prev = sorted[sorted.length - 2].value;
    return ((latest - prev) / (prev || 1)) * 100;
  };
  