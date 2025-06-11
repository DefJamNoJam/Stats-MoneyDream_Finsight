// src/hooks/useMinuteChartData.js
import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

export const useMinuteChartData = (selectedSymbol) => {
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(false);
  const socketRef = useRef(null);

  const fetchInitialCandles = useCallback(async (symbol) => {
    setLoading(true);
    try {
      // 최근 200개 1분봉
      const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=1m&limit=200`;
      const response = await axios.get(url);
      const formatted = response.data.map(item => ({
        time: new Date(item[0]),
        open: parseFloat(item[1]),
        high: parseFloat(item[2]),
        low: parseFloat(item[3]),
        close: parseFloat(item[4]),
      }));
      setChartData(formatted);
    } catch (err) {
      toast.error('과거 데이터를 불러오는 중 오류가 발생했습니다.');
      console.error('REST API error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const connectWebSocket = useCallback((symbol) => {
    if (socketRef.current) {
      socketRef.current.close();
    }
    const wsSymbol = symbol.toLowerCase();
    // 1분봉 WebSocket
    socketRef.current = new WebSocket(`wss://stream.binance.com:9443/ws/${wsSymbol}@kline_1m`);

    socketRef.current.onmessage = (event) => {
      const message = JSON.parse(event.data);
      const candle = message.k;
      if (candle.x) {
        // 종가 확정된 캔들
        const newCandle = {
          time: new Date(candle.t),
          open: parseFloat(candle.o),
          high: parseFloat(candle.h),
          low: parseFloat(candle.l),
          close: parseFloat(candle.c),
        };
        setChartData(prev => {
          const updated = [...prev];
          if (updated.length === 0) {
            updated.push(newCandle);
          } else {
            const lastCandle = updated[updated.length - 1];
            if (lastCandle.time.getTime() === newCandle.time.getTime()) {
              updated[updated.length - 1] = newCandle;
            } else {
              updated.push(newCandle);
              // 200개 이상이면 오래된 것 제거
              if (updated.length > 200) updated.shift();
            }
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
    fetchInitialCandles(selectedSymbol);
    connectWebSocket(selectedSymbol);
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [selectedSymbol, fetchInitialCandles, connectWebSocket]);

  return { chartData, loading };
};
