// src/hooks/useChartData.js
import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

export const useChartData = (selectedSymbol, interval = '1d') => {
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(false);
  const socketRef = useRef(null);

  const fetchInitialCandles = useCallback(async (symbol, intervalParam) => {
    setLoading(true);
    try {
      const limit = 1000; // 한 번에 가져올 최대 데이터 수
      let earliestStartTime;

      if (intervalParam === '1h') {
        // 1시간봉: 최근 6개월치 데이터만 불러오도록 설정 (6개월 ≒ 180일)
        earliestStartTime = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).getTime();
      } else {
        // 1일봉: 전체 데이터를 불러오기 (최초 시작일)
        earliestStartTime = new Date("2017-07-14T00:00:00Z").getTime();
      }

      let currentStartTime = earliestStartTime;
      let allCandles = [];

      while (true) {
        const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${intervalParam}&startTime=${currentStartTime}&limit=${limit}`;
        const response = await axios.get(url);
        const data = response.data;
        
        if (!data || data.length === 0) break;
        
        allCandles = allCandles.concat(data);
        if (data.length < limit) break;

        // 마지막 캔들의 오픈타임에 interval에 해당하는 기간을 더함
        const addTime = intervalParam === '1h' 
          ? 60 * 60 * 1000     // 1시간 (밀리초)
          : 24 * 60 * 60 * 1000; // 1일 (밀리초)
        const lastCandle = data[data.length - 1];
        currentStartTime = lastCandle[0] + addTime;
      }

      const formatted = allCandles.map(item => ({
        time: new Date(item[0]),
        open: parseFloat(item[1]),
        high: parseFloat(item[2]),
        low: parseFloat(item[3]),
        close: parseFloat(item[4]),
        volume: parseFloat(item[5]),
      }));
      setChartData(formatted);
    } catch (err) {
      toast.error('과거 데이터를 불러오는 중 오류가 발생했습니다.');
      console.error('REST API error:', err);
      setChartData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const connectWebSocket = useCallback((symbol, intervalParam) => {
    if (socketRef.current) {
      socketRef.current.close();
    }
    const wsSymbol = symbol.toLowerCase();
    // WebSocket URL에 intervalParam 반영: 예, kline_1h 또는 kline_1d
    socketRef.current = new WebSocket(`wss://stream.binance.com:9443/ws/${wsSymbol}@kline_${intervalParam}`);

    socketRef.current.onmessage = (event) => {
      const message = JSON.parse(event.data);
      const candle = message.k;
      if (candle.x) {
        const newCandle = {
          time: new Date(candle.t),
          open: parseFloat(candle.o),
          high: parseFloat(candle.h),
          low: parseFloat(candle.l),
          close: parseFloat(candle.c),
          volume: parseFloat(candle.v),
        };
        setChartData(prev => {
          const updated = [...prev];
          const lastCandle = updated[updated.length - 1];
          if (lastCandle && lastCandle.time.getTime() === newCandle.time.getTime()) {
            updated[updated.length - 1] = newCandle;
          } else {
            updated.push(newCandle);
          }
          return updated;
        });
      }
    };

    // socketRef.current.onerror = () => {
    //   toast.error('실시간 데이터 수신 중 오류가 발생했습니다.');
    //   console.error('WebSocket error');
    // };

    socketRef.current.onclose = () => {
      console.log('WebSocket closed');
    };
  }, []);

  useEffect(() => {
    setChartData([]);
    fetchInitialCandles(selectedSymbol, interval);
    connectWebSocket(selectedSymbol, interval);
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [selectedSymbol, interval, fetchInitialCandles, connectWebSocket]);

  return { chartData, loading };
};
