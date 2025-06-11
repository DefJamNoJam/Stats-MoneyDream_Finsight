import { useState, useCallback } from 'react';
import { toast } from 'react-toastify';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

// 유틸리티 함수: 숫자 파싱 및 기본값 처리
const parseNumber = (value, defaultValue = 0) => {
  const num = parseFloat(value);
  return isNaN(num) ? defaultValue : num;
};

// 유틸리티 함수: 날짜 유효성 검사 및 파싱 (시간 포함)
const parseDate = (dateStr) => {
  if (!dateStr) return null;
  
  const formats = [
    (str) => new Date(str),
    (str) => {
      const parts = str.match(/(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})/);
      return parts ? new Date(parts[1], parts[2]-1, parts[3], parts[4], parts[5], parts[6]) : null;
    },
    (str) => {
      const parts = str.match(/(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2}):(\d{2})/);
      return parts ? new Date(parts[3], parts[2]-1, parts[1], parts[4], parts[5], parts[6]) : null;
    },
    (str) => {
      const parts = str.match(/(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2}):(\d{2})/);
      return parts ? new Date(parts[3], parts[1]-1, parts[2], parts[4], parts[5], parts[6]) : null;
    },
    (str) => {
      const timestamp = parseInt(str);
      return isNaN(timestamp) ? null : new Date(timestamp);
    }
  ];

  for (const format of formats) {
    const date = format(dateStr);
    if (date && !isNaN(date.getTime())) {
      return date;
    }
  }
  
  console.warn(`지원되지 않는 날짜 형식: ${dateStr}`);
  return null;
};

// 유틸리티 함수: 이상치 감지 (통계적 접근)
const detectStatisticalOutlier = (value, values, fieldName) => {
  if (!value || values.length < 5) return null;
  
  const sortedValues = [...values].sort((a, b) => a - b);
  const q1 = sortedValues[Math.floor(sortedValues.length * 0.25)];
  const q3 = sortedValues[Math.floor(sortedValues.length * 0.75)];
  const iqr = q3 - q1;
  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;
  
  if (value < lowerBound || value > upperBound) {
    return `${fieldName} 값이 통계적으로 이상치 (${value}): 정상 범위 ${lowerBound.toFixed(2)}~${upperBound.toFixed(2)}`;
  }
  
  return null;
};

// 유틸리티 함수: 기본 이상치 감지 (임계값 기반)
const detectThresholdOutlier = (value, fieldName, maxThreshold, minThreshold = 0) => {
  if (value > maxThreshold || value < minThreshold) {
    return `${fieldName} 값이 비정상적으로 ${value > maxThreshold ? '큼' : '작음'}: ${value}`;
  }
  return null;
};

// 유틸리티 함수: 데이터 추정
const estimateData = (row, priceHistory, fieldMissing) => {
  const updates = { ...row };
  const side = row.Side?.toString().trim().toUpperCase();
  let updated = false;
  
  if (fieldMissing.includes('Price')) {
    if (priceHistory.length > 0) {
      const recentPrice = priceHistory[priceHistory.length - 1];
      updates.Price = recentPrice;
      updates.estimatedFields = [...(updates.estimatedFields || []), 'Price'];
      updated = true;
    } else if (updates.Amount && updates.Executed) {
      updates.Price = updates.Amount / updates.Executed;
      updates.estimatedFields = [...(updates.estimatedFields || []), 'Price'];
      updated = true;
    }
  }
  
  if (fieldMissing.includes('Executed')) {
    if (updates.Amount && updates.Price) {
      updates.Executed = updates.Amount / updates.Price;
      updates.estimatedFields = [...(updates.estimatedFields || []), 'Executed'];
      updated = true;
    } else {
      updates.Executed = side === 'BUY' ? 0.1 : 0.1;
      updates.estimatedFields = [...(updates.estimatedFields || []), 'Executed'];
      updated = true;
    }
  }
  
  if (fieldMissing.includes('Amount')) {
    if (updates.Price && updates.Executed) {
      updates.Amount = updates.Price * updates.Executed;
      updates.estimatedFields = [...(updates.estimatedFields || []), 'Amount'];
      updated = true;
    }
  }
  
  if (fieldMissing.includes('Fee')) {
    updates.Fee = updates.Amount * 0.002;
    updates.estimatedFields = [...(updates.estimatedFields || []), 'Fee'];
    updated = true;
  }
  
  return { updates, updated };
};

// 유틸리티 함수: 거래 패턴 기반 Reason 추정 (개선된 버전)
const inferReason = (row, prevRows, marketData) => {
  if (row.Reason) return row.Reason;
  
  const side = row.Side?.toUpperCase();
  const currentPrice = parseNumber(row.Price);
  const date = row['Date(UTC)'];
  
  const recentTrades = prevRows.slice(-5);
  
  if (recentTrades.length > 0) {
    const similarPriceTrades = recentTrades.filter(t => 
      Math.abs(parseNumber(t.Price) - currentPrice) / currentPrice < 0.02
    );
    
    if (similarPriceTrades.length >= 2) {
      return side === 'BUY' 
        ? 'Support level accumulation' 
        : 'Resistance level profit taking';
    }
    
    const priceTrend = recentTrades.map(t => parseNumber(t.Price));
    const isUptrend = priceTrend.length > 2 && 
      priceTrend.slice(-3).every((price, i, arr) => i === 0 || price > arr[i-1]);
    const isDowntrend = priceTrend.length > 2 && 
      priceTrend.slice(-3).every((price, i, arr) => i === 0 || price < arr[i-1]);
    
    if (side === 'BUY') {
      if (isDowntrend) return 'Buy the dip';
      if (isUptrend) return 'Momentum follow through';
    } else {
      if (isUptrend) return 'Take profit on uptrend';
      if (isDowntrend) return 'Cut loss on downtrend';
    }
    
    const sidePattern = recentTrades.slice(-3).map(t => t.Side?.toUpperCase());
    if (sidePattern.filter(s => s === side).length >= 2) {
      return side === 'BUY' 
        ? 'Consistent accumulation strategy' 
        : 'Systematic profit taking';
    }
  }
  
  if (marketData && marketData.length > 0) {
    const dateTime = date instanceof Date ? date : new Date(date);
    const nearestMarketData = marketData.find(d => {
      const marketTime = new Date(d.time);
      return Math.abs(marketTime - dateTime) < 24 * 60 * 60 * 1000;
    });
    
    if (nearestMarketData) {
      const marketPrice = nearestMarketData.close;
      const priceDiff = (currentPrice - marketPrice) / marketPrice;
      
      if (side === 'BUY' && priceDiff < -0.03) return 'Market dip buy opportunity';
      if (side === 'SELL' && priceDiff > 0.03) return 'Market peak sell';
    }
  }
  
  return side === 'BUY' ? 'Regular accumulation' : 'Regular profit taking';
};

// 유틸리티 함수: 데이터 클리닝 및 보정
const cleanAndNormalizeData = (row) => {
  const cleaned = { ...row };
  
  if (cleaned.Side) {
    const side = cleaned.Side.toString().trim().toUpperCase();
    cleaned.Side = side.includes('BUY') || side.includes('LONG') ? 'BUY' : 
                  (side.includes('SELL') || side.includes('SHORT') ? 'SELL' : cleaned.Side);
  }
  
  if (cleaned.Pair) {
    const pair = cleaned.Pair.toString().trim().toUpperCase();
    if (pair.includes('BTC') && pair.includes('USDT')) {
      cleaned.Pair = 'BTC/USDT';
    } else if (pair === 'BTC') {
      cleaned.Pair = 'BTC/USDT';
    }
  }
  
  return cleaned;
};

// 거래 데이터 검증 함수
const validateTrade = (trade, marketData, allTrades) => {
  const issues = [];
  
  if (!trade['Date(UTC)']) {
    issues.push('날짜 정보 누락');
  }
  
  if (!trade.Side) {
    issues.push('거래 방향(Side) 정보 누락');
  }
  
  const price = parseNumber(trade.Price);
  if (price <= 0) {
    issues.push(`유효하지 않은 가격: ${price}`);
  }
  
  if (marketData && marketData.length > 0 && trade['Date(UTC)']) {
    const tradeDate = new Date(trade['Date(UTC)']);
    const relevantMarketData = marketData.filter(md => {
      const marketDate = new Date(md.time);
      return Math.abs(marketDate - tradeDate) < 24 * 60 * 60 * 1000;
    });
    
    if (relevantMarketData.length > 0) {
      const avgMarketPrice = relevantMarketData.reduce((sum, md) => sum + md.close, 0) / relevantMarketData.length;
      const priceDifference = Math.abs(price - avgMarketPrice) / avgMarketPrice;
      
      if (priceDifference > 0.1) {
        issues.push(`거래 가격($${price})이 시장 가격($${avgMarketPrice.toFixed(2)})과 ${(priceDifference * 100).toFixed(2)}% 차이`);
      }
    }
  }
  
  if (allTrades.length > 0) {
    const prevTrade = allTrades[allTrades.length - 1];
    const currentDate = new Date(trade['Date(UTC)']);
    const prevDate = new Date(prevTrade['Date(UTC)']);
    
    if (currentDate < prevDate) {
      issues.push('거래 시간이 이전 거래보다 이전임');
    }
  }
  
  return issues;
};

export const useTradeUpload = (selectedSymbol) => {
  const [tradeData, setTradeData] = useState([]);
  const [signalScenarioData, setSignalScenarioData] = useState([]);
  const [unmatchedTrades, setUnmatchedTrades] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState('');
  const [tradeCount, setTradeCount] = useState(0);
  const [missingDataInfo, setMissingDataInfo] = useState({ count: 0, details: [] });
  const [dataQualityIssues, setDataQualityIssues] = useState([]);
  const [priceHistory, setPriceHistory] = useState([]);

  // PnL 계산 로직 (FIFO, LIFO)
  const calculatePnl = useCallback((trades, method = 'FIFO') => {
    const completedTrades = [];
    const unmatched = [];
    let buyQueue = [];

    const sortedTrades = [...trades].sort((a, b) => new Date(a['Date(UTC)']) - new Date(b['Date(UTC)']));

    for (const row of sortedTrades) {
      const side = row.Side?.toUpperCase();

      if (side === 'BUY') {
        buyQueue.push(row);
      } else if (side === 'SELL') {
        if (buyQueue.length === 0) {
          unmatched.push(row);
          continue;
        }

        let remainingSellQty = parseNumber(row.Executed, 1);

        if (method === 'LIFO') {
          while (remainingSellQty > 0 && buyQueue.length > 0) {
            const buyTrade = buyQueue[buyQueue.length - 1];
            const buyQty = parseNumber(buyTrade.Executed, 1);
            const sellQty = Math.min(buyQty, remainingSellQty);

            const buyPrice = parseNumber(buyTrade.Price);
            const sellPrice = parseNumber(row.Price);
            const buyFee = parseNumber(buyTrade.Fee);
            const sellFee = parseNumber(row.Fee);

            const pnl = (sellPrice - buyPrice) * sellQty - (buyFee * (sellQty / buyQty) + sellFee * (sellQty / parseNumber(row.Executed, 1)));
            const pnlPercentage = ((sellPrice - buyPrice) / buyPrice * 100).toFixed(2);

            const buyDate = new Date(buyTrade['Date(UTC)']);
            const sellDate = new Date(row['Date(UTC)']);
            const holdDays = Math.max(0, (sellDate - buyDate) / (1000 * 60 * 60 * 24));

            const annualizedReturn = holdDays > 0 
              ? ((Math.pow((1 + pnl / (buyPrice * sellQty)), (365 / holdDays)) - 1) * 100).toFixed(2)
              : 0;

            completedTrades.push({
              date: buyTrade['Date(UTC)'],
              price: buyPrice,
              text: '사용자 매수',
              type: 'buy',
              sellDate: row['Date(UTC)'],
              sellPrice,
              pnl: Math.round(pnl * 100) / 100,
              pnlPercentage: parseFloat(pnlPercentage),
              holdDays: Math.round(holdDays * 10) / 10,
              apr: parseFloat(annualizedReturn),
              reason: buyTrade.Reason || '알 수 없음',
              sellReason: row.Reason || '알 수 없음',
              hasMissingData: buyTrade.hasMissingData || row.hasMissingData || false,
              executedQty: sellQty,
              estimatedFields: [...(buyTrade.estimatedFields || []), ...(row.estimatedFields || [])],
            });

            remainingSellQty -= sellQty;
            buyTrade.Executed -= sellQty;

            if (buyTrade.Executed <= 0.000001) {
              buyQueue.pop();
            }
          }
        } else {
          while (remainingSellQty > 0 && buyQueue.length > 0) {
            const buyTrade = buyQueue[0];
            const buyQty = parseNumber(buyTrade.Executed, 1);
            const sellQty = Math.min(buyQty, remainingSellQty);

            const buyPrice = parseNumber(buyTrade.Price);
            const sellPrice = parseNumber(row.Price);
            const buyFee = parseNumber(buyTrade.Fee);
            const sellFee = parseNumber(row.Fee);

            const pnl = (sellPrice - buyPrice) * sellQty - (buyFee * (sellQty / buyQty) + sellFee * (sellQty / parseNumber(row.Executed, 1)));
            const pnlPercentage = ((sellPrice - buyPrice) / buyPrice * 100).toFixed(2);

            const buyDate = new Date(buyTrade['Date(UTC)']);
            const sellDate = new Date(row['Date(UTC)']);
            const holdDays = Math.max(0, (sellDate - buyDate) / (1000 * 60 * 60 * 24));

            const annualizedReturn = holdDays > 0 
              ? ((Math.pow((1 + pnl / (buyPrice * sellQty)), (365 / holdDays)) - 1) * 100).toFixed(2)
              : 0;

            completedTrades.push({
              date: buyTrade['Date(UTC)'],
              price: buyPrice,
              text: '사용자 매수',
              type: 'buy',
              sellDate: row['Date(UTC)'],
              sellPrice,
              pnl: Math.round(pnl * 100) / 100,
              pnlPercentage: parseFloat(pnlPercentage),
              holdDays: Math.round(holdDays * 10) / 10,
              apr: parseFloat(annualizedReturn),
              reason: buyTrade.Reason || '알 수 없음',
              sellReason: row.Reason || '알 수 없음',
              hasMissingData: buyTrade.hasMissingData || row.hasMissingData || false,
              executedQty: sellQty,
              estimatedFields: [...(buyTrade.estimatedFields || []), ...(row.estimatedFields || [])],
            });

            remainingSellQty -= sellQty;
            buyTrade.Executed -= sellQty;

            if (buyTrade.Executed <= 0.000001) {
              buyQueue.shift();
            }
          }
        }

        if (remainingSellQty > 0.000001) {
          unmatched.push({ ...row, Executed: remainingSellQty });
        }
      }
    }

    unmatched.push(...buyQueue.filter(trade => parseNumber(trade.Executed) > 0.000001));
    setUnmatchedTrades(unmatched);

    return completedTrades;
  }, []);

  // 거래 데이터 전처리 함수 (개선된 버전)
  const preprocessTradeData = useCallback((rawData, marketData = []) => {
    const trades = [];
    const missingDataDetails = [];
    const qualityIssues = [];
    let missingDataCount = 0;

    const requiredFields = ['Date(UTC)', 'Side', 'Price'];
    const recommendedFields = ['Executed', 'Amount', 'Fee', 'Reason'];

    const allPrices = rawData
      .map(row => parseNumber(row.Price))
      .filter(price => price > 0);

    const allFees = rawData
      .map(row => parseNumber(row.Fee))
      .filter(fee => fee > 0);

    const newPriceHistory = [];

    rawData.forEach((row, index) => {
      const cleanedRow = cleanAndNormalizeData(row);
      const date = parseDate(cleanedRow['Date(UTC)']);
      const side = cleanedRow.Side?.toString().trim().toUpperCase();

      const missingRequiredFields = requiredFields.filter(field => 
        !cleanedRow[field] && field !== 'Date(UTC)'
      );

      if (!date) missingRequiredFields.push('Date(UTC)');

      if (missingRequiredFields.length > 0) {
        missingDataCount++;
        missingDataDetails.push({
          row: index + 1,
          reason: `필수 필드 누락: ${missingRequiredFields.join(', ')}`,
          date: cleanedRow['Date(UTC)'] || '알 수 없음',
          side: side || '알 수 없음',
        });
        if (missingRequiredFields.includes('Date(UTC)') || missingRequiredFields.includes('Side')) {
          return;
        }
      }

      let price = parseNumber(cleanedRow.Price);
      let executed = parseNumber(cleanedRow.Executed, 1);
      let amount = parseNumber(cleanedRow.Amount);
      let fee = parseNumber(cleanedRow.Fee, 0);

      const missingRecommendedFields = recommendedFields.filter(field => !cleanedRow[field]);

      if (missingRecommendedFields.length > 0) {
        const { updates, updated } = estimateData(
          { ...cleanedRow, Price: price, Executed: executed, Amount: amount, Fee: fee },
          [...priceHistory, ...newPriceHistory],
          missingRecommendedFields
        );

        if (updated) {
          price = parseNumber(updates.Price);
          executed = parseNumber(updates.Executed);
          amount = parseNumber(updates.Amount);
          fee = parseNumber(updates.Fee);

          qualityIssues.push({
            row: index + 1,
            date: date ? date.toISOString() : cleanedRow['Date(UTC)'] || '알 수 없음',
            side,
            issue: `필드 추정됨: ${updates.estimatedFields.join(', ')}`,
          });
        }
      }

      if (price > 0) {
        const priceStatOutlier = detectStatisticalOutlier(price, allPrices, 'Price');
        const priceThreshOutlier = detectThresholdOutlier(price, 'Price', 1000000);

        if (priceStatOutlier) {
          qualityIssues.push({
            row: index + 1,
            date: date ? date.toISOString() : cleanedRow['Date(UTC)'],
            side,
            issue: priceStatOutlier,
          });
        } else if (priceThreshOutlier) {
          qualityIssues.push({
            row: index + 1,
            date: date ? date.toISOString() : cleanedRow['Date(UTC)'],
            side,
            issue: priceThreshOutlier,
          });
        }
        newPriceHistory.push(price);
      }

      if (fee > 0) {
        const feeStatOutlier = detectStatisticalOutlier(fee, allFees, 'Fee');
        const feeThreshOutlier = detectThresholdOutlier(fee, 'Fee', 1000);

        if (feeStatOutlier) {
          qualityIssues.push({
            row: index + 1,
            date: date ? date.toISOString() : cleanedRow['Date(UTC)'],
            side,
            issue: feeStatOutlier,
          });
        } else if (feeThreshOutlier) {
          qualityIssues.push({
            row: index + 1,
            date: date ? date.toISOString() : cleanedRow['Date(UTC)'],
            side,
            issue: feeThreshOutlier,
          });
        }
      }

      const trade = {
        'Date(UTC)': date,
        Pair: cleanedRow.Pair || `${selectedSymbol.replace('USDT', '')}/USDT`,
        Side: side,
        Price: price,
        Executed: executed,
        Amount: amount || (price * executed),
        Fee: fee,
        Reason: cleanedRow.Reason,
        hasMissingData: missingRecommendedFields.length > 0,
        missingFields: missingRecommendedFields,
        estimatedFields: cleanedRow.estimatedFields || [],
      };

      const validationIssues = validateTrade(trade, marketData, trades);

      if (validationIssues.length > 0) {
        qualityIssues.push({
          row: index + 1,
          date: date ? date.toISOString() : cleanedRow['Date(UTC)'],
          side,
          issue: `검증 실패: ${validationIssues.join(', ')}`,
        });
      }

      if (!trade.Reason) {
        trade.Reason = inferReason(trade, trades, marketData);
        trade.estimatedFields.push('Reason');
      }

      trades.push(trade);
    });

    setPriceHistory(prev => [...prev, ...newPriceHistory]);

    setMissingDataInfo({
      count: missingDataCount,
      details: missingDataDetails,
    });

    setDataQualityIssues(qualityIssues);

    if (missingDataCount > 0) {
      toast.warn(`${missingDataCount}개의 행이 필수 데이터 누락으로 제외되었습니다.`);
    }

    if (qualityIssues.length > 0) {
      toast.warn(`${qualityIssues.length}개의 데이터 품질 문제가 발견되었습니다. 자세한 내용은 인사이트 패널에서 확인하세요.`);
    }

    return trades;
  }, [selectedSymbol, priceHistory]);

  // 벌크 데이터 추정 및 보정
  const enhanceDataQuality = useCallback((trades) => {
    if (trades.length === 0) return trades;

    const enhanced = [...trades];
    let modified = false;

    enhanced.sort((a, b) => new Date(a['Date(UTC)']) - new Date(b['Date(UTC)']));

    const checkDateGaps = enhanced.map(trade => new Date(trade['Date(UTC)']));
    const timeGaps = [];
    for (let i = 1; i < checkDateGaps.length; i++) {
      timeGaps.push(checkDateGaps[i] - checkDateGaps[i-1]);
    }

    if (timeGaps.length > 5) {
      const avgGap = timeGaps.reduce((sum, gap) => sum + gap, 0) / timeGaps.length;
      const stdDev = Math.sqrt(
        timeGaps.reduce((sum, gap) => sum + Math.pow(gap - avgGap, 2), 0) / timeGaps.length
      );
      const suspiciousGaps = timeGaps.filter(gap => gap > avgGap + 3 * stdDev);
      if (suspiciousGaps.length > 0) {
        toast.info(`비정상적으로 긴 거래 간격이 ${suspiciousGaps.length}개 감지되었습니다.`);
      }
    }

    enhanced.forEach(trade => {
      const expectedAmount = trade.Price * trade.Executed;
      if (Math.abs(expectedAmount - trade.Amount) > 0.01 * expectedAmount) {
        trade.Amount = expectedAmount;
        trade.estimatedFields = [...(trade.estimatedFields || []), 'Amount(보정됨)'];
        modified = true;
      }
    });

    enhanced.forEach(trade => {
      if (!trade.Reason || (trade.estimatedFields && trade.estimatedFields.includes('Reason'))) {
        const similarTrades = enhanced.filter(t => 
          t.Side === trade.Side &&
          Math.abs(parseNumber(t.Price) - parseNumber(trade.Price)) / parseNumber(trade.Price) < 0.02 &&
          t.Reason
        );
        if (similarTrades.length > 0) {
          const reasonFrequency = {};
          similarTrades.forEach(t => {
            const r = t.Reason;
            reasonFrequency[r] = (reasonFrequency[r] || 0) + 1;
          });
          const sortedReasons = Object.entries(reasonFrequency).sort((a, b) => b[1] - a[1]);
          if (sortedReasons.length > 0) {
            const inferredReason = sortedReasons[0][0];
            trade.Reason = inferredReason;
            trade.estimatedFields = [...(trade.estimatedFields || []), 'Reason(보정됨)'];
            modified = true;
          }
        }
      }
    });

    if (modified) {
      toast.info('거래 데이터의 일부 필드가 보정되었습니다.');
    }

    return enhanced;
  }, []);

  // 파일 업로드 처리 함수 (CSV, Excel 지원)
  const handleFileUpload = useCallback((file) => {
    if (!file || !file.name) {
      toast.error('업로드된 파일이 올바르지 않습니다.');
      return;
    }
    const fileName = file.name;
    const extension = fileName.split('.').pop().toLowerCase();

    setLoading(true);

    if (extension === 'csv') {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (result) => {
          const rawData = result.data;
          const processed = preprocessTradeData(rawData);
          setTradeData(processed);
          setFileName(fileName);
          setTradeCount(processed.length);
          setLoading(false);
        },
        error: (err) => {
          toast.error('CSV 파싱 중 오류 발생: ' + err.message);
          setLoading(false);
        },
      });
    } else if (extension === 'xlsx' || extension === 'xls') {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rawData = XLSX.utils.sheet_to_json(worksheet);
        const processed = preprocessTradeData(rawData);
        setTradeData(processed);
        setFileName(fileName);
        setTradeCount(processed.length);
        setLoading(false);
      };
      reader.onerror = () => {
        toast.error('엑셀 파일 읽기 실패');
        setLoading(false);
      };
      reader.readAsArrayBuffer(file);
    } else {
      toast.error('지원되지 않는 파일 형식입니다. CSV 또는 Excel 파일을 업로드해주세요.');
      setLoading(false);
    }
  }, [preprocessTradeData]);

  return {
    tradeData,
    setTradeData,
    signalScenarioData,
    unmatchedTrades,
    loading,
    fileName,
    tradeCount,
    missingDataInfo,
    dataQualityIssues,
    priceHistory,
    calculatePnl,
    preprocessTradeData,
    enhanceDataQuality,
    handleFileUpload,
  };
};
