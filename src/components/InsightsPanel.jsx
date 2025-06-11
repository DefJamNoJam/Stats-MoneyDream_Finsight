// src/components/InsightsPanel.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Button
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useMistakeAnalysis } from '../hooks/useMistakeAnalysis';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, ChartTooltip, Legend);

const InsightsPanel = ({
  signalScenarioData,
  summaryStats,
  chartData,
  tradeData,
  // GPT 분석 관련 props
  gptAnalysisResult,
  analysisLoading,
  analysisError,
  handleGptAnalysis
}) => {
  const [loading, setLoading] = useState(false);
  const { analyzeMistakes, mistakeAnalysis } = useMistakeAnalysis(signalScenarioData, chartData);
  const totalTrades = signalScenarioData?.length || 0;
  const winningTrades = signalScenarioData?.filter(t => t.pnl > 0)?.length || 0;
  const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
  const avgHoldDays = totalTrades > 0 ? signalScenarioData.reduce((sum, trade) => sum + trade.holdDays, 0) / totalTrades : 0;
  const avgProfit = winningTrades > 0 ? signalScenarioData.filter(t => t.pnl > 0).reduce((sum, t) => sum + t.pnl, 0) / winningTrades : 0;
  const avgLoss = totalTrades - winningTrades > 0 ? signalScenarioData.filter(t => t.pnl < 0).reduce((sum, t) => sum + t.pnl, 0) / (totalTrades - winningTrades) : 0;
  const maxProfit = totalTrades > 0 ? Math.max(...signalScenarioData.map(t => t.pnl)) : 0;
  const maxLoss = totalTrades > 0 ? Math.min(...signalScenarioData.map(t => t.pnl)) : 0;
  const fomoPanicCount = signalScenarioData?.filter(t => t.reason && (t.reason.includes('FOMO') || t.reason.includes('panic')))?.length || 0;

  const fetchDetailedInsights = useCallback(() => {
    if (totalTrades === 0) return;
    setLoading(true);
    analyzeMistakes();
    setLoading(false);
  }, [signalScenarioData, chartData, analyzeMistakes, totalTrades]);

  const cellStyle = {
    borderBottom: '1px solid #eee',
    borderRight: '1px solid #f0f0f0',
  };

  useEffect(() => {
    fetchDetailedInsights();
  }, [fetchDetailedInsights]);

  return (
    <Paper sx={{ p: 3, backgroundColor: '#fafcff' }}>
      {/* 손익 요약 Accordion */}
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6" fontWeight={700}>📌 손익 요약</Typography>
        </AccordionSummary>
        <AccordionDetails>
          {/* 시간대별 거래 분포: 매수와 매도 데이터를 모두 표시 */}
          <Box mb={4}>
            <Typography variant="subtitle1" fontWeight={600} mb={1}>
              🕐 시간대별 거래 분포
            </Typography>
            <Bar
              data={{
                labels: Array.from({ length: 24 }, (_, i) => `${i}시`),
                datasets: [
                  {
                    label: '매수 거래 수',
                    data: (() => {
                      const buyHourly = Array(24).fill(0);
                      signalScenarioData?.forEach(t => {
                        if (t.buyDate) {
                          const hour = new Date(t.buyDate).getHours();
                          buyHourly[hour]++;
                        }
                      });
                      return buyHourly;
                    })(),
                    backgroundColor: 'rgba(79,163,255,0.8)', // 파란색
                    borderRadius: 4,
                  },
                  {
                    label: '매도 거래 수',
                    data: (() => {
                      const sellHourly = Array(24).fill(0);
                      signalScenarioData?.forEach(t => {
                        if (t.sellDate) {
                          const hour = new Date(t.sellDate).getHours();
                          sellHourly[hour]++;
                        }
                      });
                      return sellHourly;
                    })(),
                    backgroundColor: 'rgba(255,99,132,0.8)', // 빨간색
                    borderRadius: 4,
                  },
                ],
              }}
              options={{
                responsive: true,
                plugins: {
                  legend: { display: true },
                  tooltip: {
                    callbacks: {
                      label: (context) => `거래 수: ${context.raw}`,
                    },
                  },
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: {
                      precision: 0,
                      stepSize: 1,
                    },
                  },
                },
              }}
            />
          </Box>

          {/* 매수-매도 페어별 보유 시간 및 손익 표 */}
          <Box mb={4}>
            <Typography variant="subtitle1" fontWeight={600} mb={1}>
              📋 매수-매도 페어별 보유 시간 및 손익
            </Typography>
            <Box sx={{
              overflowX: 'auto',
              maxHeight: 360,
              border: '1px solid #ddd',
              borderRadius: 2,
            }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#eef3f8' }}>
                    <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#eef3f8' }}>Pair</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#eef3f8' }}>Buy_Date</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#eef3f8' }}>Sell_Date</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#eef3f8' }} align="right">Holding_Time</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#eef3f8' }} align="right">Buy_Price</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#eef3f8' }} align="right">Sell_Price</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#eef3f8' }} align="right">PnL</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {signalScenarioData?.map((row, idx) => (
                    <TableRow key={idx} hover>
                      <TableCell sx={cellStyle}>{row.pair}</TableCell>
                      <TableCell sx={cellStyle}>{row.displayBuyDate}</TableCell>
                      <TableCell sx={cellStyle}>{row.displaySellDate}</TableCell>
                      <TableCell align="right" sx={cellStyle}>
                        {Math.floor(row.holdMinutes / 60)}시간 {row.holdMinutes % 60}분
                      </TableCell>
                      <TableCell align="right" sx={cellStyle}>{Number(row.buyPrice).toLocaleString()}</TableCell>
                      <TableCell align="right" sx={cellStyle}>{Number(row.sellPrice).toLocaleString()}</TableCell>
                      <TableCell align="right" sx={{ ...cellStyle, color: row.pnl >= 0 ? 'green' : 'red' }}>
                        {Number(row.pnl).toLocaleString()} USDT
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </Box>
          
          {/* 손익 요약 Grid */}
          <Grid container spacing={2} mb={4}>
            {summaryStats && [
              ['승률', `${summaryStats.winRate.toFixed(2)}%`, '#f9fbfd'],
              ['총 거래 횟수', `${summaryStats.totalTrades.toLocaleString()}회`, '#f9fbfd'],
              ['총 이익', `${summaryStats.totalProfit.toLocaleString()} USDT`, '#f5fff5', 'green'],
              ['총 손실', `${summaryStats.totalLoss.toLocaleString()} USDT`, '#fff5f5', 'red'],
              ['최대 수익', `${summaryStats.maxProfit.toLocaleString()} USDT`, '#f5fff8'],
              ['최대 손실', `${summaryStats.maxLoss.toLocaleString()} USDT`, '#fff5f7'],
              ['평균 손익', `${summaryStats.avgPnl.toLocaleString()} USDT`, '#ffffff'],
              ['최종 손익', `${summaryStats.finalPnl.toLocaleString()} USDT`, '#f9f9ff', summaryStats.finalPnl >= 0 ? 'green' : 'red'],
            ].map(([label, value, bg, color], idx) => {
              const isFinalPnl = label === '최종 손익';
              const numericValue = parseFloat(value.replace(/[^\d.-]/g, ''));
              const emoji = numericValue >= 0 ? '🤑' : '😭';

              return (
                <Grid item xs={6} key={idx}>
                  <Box
                    p={2}
                    borderRadius={2}
                    bgcolor={bg}
                    boxShadow="0 1px 4px rgba(0,0,0,0.05)"
                    display="flex"
                    justifyContent="space-between"
                    alignItems="center"
                    border="1px solid #e0e0e0"
                    sx={
                      isFinalPnl
                        ? {
                            animation: 'fadeBlink 3s ease-in-out infinite',
                            '@keyframes fadeBlink': {
                              '0%': { opacity: 1 },
                              '50%': { opacity: 0.4 },
                              '100%': { opacity: 1 },
                            },
                          }
                        : {}
                    }
                  >
                    <Typography fontWeight="bold" fontSize="0.95rem">{label}</Typography>
                    <Typography variant="h6" fontWeight={600} color={color || 'text.primary'}>
                      {isFinalPnl ? `${emoji} ${value}` : value}
                    </Typography>
                  </Box>
                </Grid>
              );
            })}
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* GPT 분석 인사이트 Accordion */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6" fontWeight={700}>💡 분석 인사이트</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ backgroundColor: '#f4f8ff', borderRadius: 2, p: 2, border: '1px solid #ddeaff' }}>
            {/* GPT 분석 영역: 결과가 있으면 표시, 없으면 실행 버튼과 에러 메시지 표시 */}
            {gptAnalysisResult ? (
              <Typography variant="body1" sx={{ whiteSpace: 'pre-line' }}>
                {gptAnalysisResult}
              </Typography>
            ) : (
              <>
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60px' }}>
                  <Button variant="contained" onClick={handleGptAnalysis} disabled={analysisLoading}>
                    {analysisLoading ? '분석 중...' : 'GPT 분석 실행'}
                  </Button>
                </Box>
                {analysisError && (
                  <Typography color="error" sx={{ mt: 2 }}>
                    {analysisError}
                  </Typography>
                )}
              </>
            )}
          </Box>
        </AccordionDetails>
      </Accordion>
    </Paper>
  );
};

export default InsightsPanel;
