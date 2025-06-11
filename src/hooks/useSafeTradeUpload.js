// src/hooks/useSafeTradeUpload.js
import { useState, useCallback } from 'react';
import Papa from 'papaparse';
import { toast } from 'react-toastify';

const normalizeHeader = (key) => key.trim().toLowerCase().replace(/[\s_]/g, '');
const headerMap = {
  date: 'Date(UTC)',
  time: 'Date(UTC)',
  datetime: 'Date(UTC)',
  price: 'Price',
  executed: 'Executed',
  amount: 'Amount',
  fee: 'Fee',
  side: 'Side',
  reason: 'Reason',
  pair: 'Pair',
};

const requiredHeaders = [
  'Date(UTC)', 'Pair', 'Side', 'Price', 'Executed', 'Amount', 'Fee', 'Reason'
];

const parseCleanNumber = (value, defaultValue = 0) => {
  if (typeof value === 'string') {
    value = value.replace(/,/g, '').replace(/[^0-9.\-]/g, '');
  }
  const num = parseFloat(value);
  return isNaN(num) ? defaultValue : num;
};

export const useSafeTradeUpload = (selectedSymbol) => {
  const [tradeData, setTradeData] = useState([]);
  const [fileName, setFileName] = useState('');
  const [tradeCount, setTradeCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState([]);
  const [dataQualityIssues, setDataQualityIssues] = useState([]);
  const [signalScenarioData, setSignalScenarioData] = useState([]);
  const [summaryStats, setSummaryStats] = useState(null);

  const preprocessTradeData = useCallback((rawData) => {
    const issues = [];
    const trades = [];

    if (!rawData || rawData.length === 0 || Object.keys(rawData[0] || {}).length === 0) {
      toast.error('데이터가 비어있거나 잘못된 헤더 형식입니다.');
      return { trades: [], issues };
    }

    const normalizedHeaders = Object.keys(rawData[0]).reduce((acc, key) => {
      const norm = normalizeHeader(key);
      const mapped = headerMap[norm] || key;
      acc[mapped] = key;
      return acc;
    }, {});

    const filteredData = rawData.map(row => {
      const filteredRow = {};
      requiredHeaders.forEach(header => {
        filteredRow[header] = row[normalizedHeaders[header]];
      });
      return filteredRow;
    });

    filteredData.forEach((row, index) => {
      const get = (key) => row[key];

      const dateRaw = get('Date(UTC)');
      const action = get('Side')?.toUpperCase().trim();
      let symbol = get('Pair')?.toUpperCase().replace('/', '').trim();
      const priceRaw = get('Price');
      const executedRaw = get('Executed');
      const amountRaw = get('Amount');
      const feeRaw = get('Fee');
      let reason = get('Reason') || '없음';

      const date = new Date(dateRaw);
      if (isNaN(date.getTime())) return;
      if (!['BUY', 'SELL'].includes(action)) return;

      const selectedSymbolClean = selectedSymbol.replace('/', '');
      if (!symbol || symbol !== selectedSymbolClean) return;

      // 수수료가 USDT가 아닌 경우 제외
      if (typeof feeRaw !== 'string' || !feeRaw.endsWith('USDT')) return;

      let price = parseCleanNumber(priceRaw);
      let executed = parseCleanNumber(executedRaw, 1);
      let amount = parseCleanNumber(amountRaw);
      let fee = parseCleanNumber(feeRaw);

      if (!price && amount && executed) {
        price = amount / executed;
        issues.push({ row: index + 1, issue: `⚠️ Price 유추됨: ${price.toFixed(2)}` });
      }
      if (!executed && amount && price) {
        executed = amount / price;
        issues.push({ row: index + 1, issue: `⚠️ Executed 유추됨: ${executed.toFixed(4)}` });
      }
      if (!amount && price && executed) {
        amount = price * executed;
        issues.push({ row: index + 1, issue: `⚠️ Amount 유추됨: ${amount.toFixed(2)}` });
      }

      if (!price || price <= 0 || !executed || executed <= 0) return;
      if (price > 1000000 || fee > amount * 0.1) return;

      if (!reason || reason === '없음') {
        reason = action === 'BUY' ? '기회 포착' : '수익 실현 또는 손절';
      }

      const rounded = (v) => parseFloat(v.toFixed(6));

      trades.push({
        'Date(UTC)': date.toISOString(),
        Side: action,
        Pair: `${symbol.slice(0, -4)}/USDT`,
        Price: rounded(price),
        Executed: rounded(executed),
        Amount: rounded(amount || price * executed),
        Fee: rounded(fee),
        Reason: reason,
      });
    });

    trades.sort((a, b) => new Date(a['Date(UTC)']) - new Date(b['Date(UTC)']));

    return { trades, issues };
  }, [selectedSymbol]);

  const handleFileUpload = useCallback((e) => {
    const file = e.target.files[0];
    if (!file || !file.name.endsWith('.csv')) {
      toast.error('CSV 파일만 업로드할 수 있습니다.');
      return;
    }

    setFileName(file.name);
    setLoading(true);
    toast.info('CSV 파일 분석 중...');

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const { trades, issues } = preprocessTradeData(results.data);

        if (trades.length === 0) {
          toast.error('유효한 거래 데이터가 없습니다.');
          setLoading(false);
          return;
        }

        const matchedTrades = [];
        const buyStack = [];

        for (const row of trades) {
          if (row.Side === 'BUY') {
            buyStack.push(row);
          } else if (row.Side === 'SELL' && buyStack.length > 0) {
            const buy = buyStack.shift();

            const buyAmount = parseFloat(buy.Amount);
            const sellAmount = parseFloat(row.Amount);
            const buyFee = parseFloat(buy.Fee);
            const sellFee = parseFloat(row.Fee);

            const grossPnl = sellAmount - buyAmount;
            const netPnl = grossPnl - buyFee - sellFee;

            const holdDays = Math.ceil(
              (new Date(row['Date(UTC)']) - new Date(buy['Date(UTC)'])) / (1000 * 60 * 60 * 24)
            );

            const holdMinutes = Math.floor(
              (new Date(row['Date(UTC)']) - new Date(buy['Date(UTC)'])) / (1000 * 60)
            );
            
            const buyDateObj = new Date(buy['Date(UTC)']);
            const sellDateObj = new Date(row['Date(UTC)']);
            
            matchedTrades.push({
              pair: buy.Pair,
              buyDate: buyDateObj.toISOString(),
              sellDate: sellDateObj.toISOString(),
              displayBuyDate: buyDateObj.toLocaleString("ko-KR"),
              displaySellDate: sellDateObj.toLocaleString("ko-KR"),
              buyPrice: parseFloat(buy.Price),
              sellPrice: parseFloat(row.Price),
              pnl: parseFloat(netPnl.toFixed(2)),
              holdMinutes: Math.floor((sellDateObj - buyDateObj) / (1000 * 60)),
            });
          }
        }

        const pnls = matchedTrades.map(t => t.pnl);
        const totalProfit = pnls.filter(p => p > 0).reduce((a, b) => a + b, 0);
        const totalLoss = pnls.filter(p => p < 0).reduce((a, b) => a + b, 0);
        const finalPnl = totalProfit + totalLoss;
        const avgPnl = pnls.length ? finalPnl / pnls.length : 0;
        const winRate = pnls.length ? (pnls.filter(p => p > 0).length / pnls.length) * 100 : 0;
        const maxProfit = pnls.length ? Math.max(...pnls) : 0;
        const maxLoss = pnls.length ? Math.min(...pnls) : 0;
        const totalTrades = pnls.length;

        const summaryStats = {
          totalProfit: parseFloat(totalProfit.toFixed(2)),
          totalLoss: parseFloat(totalLoss.toFixed(2)),
          finalPnl: parseFloat(finalPnl.toFixed(2)),
          avgPnl: parseFloat(avgPnl.toFixed(2)),
          winRate: parseFloat(winRate.toFixed(2)),
          maxProfit: parseFloat(maxProfit.toFixed(2)),
          maxLoss: parseFloat(maxLoss.toFixed(2)),
          totalTrades,
        };

        setTradeData(trades);
        setTradeCount(trades.length);
        setErrors([]);
        setDataQualityIssues(issues);
        setSignalScenarioData(matchedTrades);
        setSummaryStats(summaryStats);
        setLoading(false);

        if (issues.length > 0) {
          toast.warn(`${issues.length}건의 데이터 이슈가 발견되었습니다.`);
        } else {
          toast.success('모든 거래 데이터를 정상적으로 불러왔습니다.');
        }
      },
      error: (err) => {
        toast.error(`CSV 파싱 오류: ${err.message}`);
        setLoading(false);
      },
    });
  }, [preprocessTradeData]);

  return {
    tradeData,
    handleFileUpload,
    fileName,
    tradeCount,
    loading,
    errors,
    dataQualityIssues,
    signalScenarioData,
    summaryStats,
  };
};