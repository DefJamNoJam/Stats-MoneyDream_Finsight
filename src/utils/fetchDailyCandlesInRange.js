// src/utils/fetchDailyCandlesInRange.js
import axios from 'axios';

/**
 * startTime, endTime: 타임스탬프 (ms 단위)
 * interval: '1d' (일봉) 사용
 */
export async function fetchDailyCandlesInRange(symbol, startTime, endTime) {
  const interval = '1d';
  let allData = [];
  let current = startTime;

  while (true) {
    const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&startTime=${current}&endTime=${endTime}&limit=1000`;
    const response = await axios.get(url);
    const klines = response.data;
    if (!klines.length) break; // 데이터 없으면 종료

    const parsed = klines.map(item => ({
      time: new Date(item[0]),
      open: parseFloat(item[1]),
      high: parseFloat(item[2]),
      low: parseFloat(item[3]),
      close: parseFloat(item[4]),
    }));
    allData = [...allData, ...parsed];

    // 마지막 봉의 closeTime 이후로 조회
    const lastCloseTime = klines[klines.length - 1][6];
    const nextTime = lastCloseTime + 1;
    if (nextTime >= endTime) break;
    current = nextTime;

    if (klines.length < 1000) break;
  }

  return allData;
}
