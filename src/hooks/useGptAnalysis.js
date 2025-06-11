import { useState } from 'react';
import axios from 'axios';

const useGptAnalysis = () => {
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState('');

  const fetchAnalysis = async ({
    tradeData,
    summaryStats,
    signalScenarioData,
    timeDistribution,
    pairHoldTimeData,
  }) => {
    setAnalysisLoading(true);
    setAnalysisError('');
    setAnalysisResult(null);

    try {
      // 1) summaryStats에서 기존 요약 정보 가져오기
      const totalTrades = summaryStats?.totalTrades || 0;
      const avgHoldDays = summaryStats?.avgHoldDays || 0;
      const winRate = summaryStats?.winRate || 0;
      const maxProfit = summaryStats?.maxProfit || 0;
      const maxLoss = summaryStats?.maxLoss || 0;
      const finalPnl = summaryStats?.finalPnl || 0;

      // 2) 시간대별 거래 분포 및 손익 분석
      let timeDistAnalysis = '';
      let highLossHours = [];
      if (Array.isArray(timeDistribution) && timeDistribution.length === 24) {
        timeDistAnalysis = timeDistribution
          .map((count, hour) => `${hour}시: ${count}건`)
          .join(', ');

        const hourlyPnl = Array(24).fill(0);
        if (Array.isArray(pairHoldTimeData)) {
          pairHoldTimeData.forEach((trade) => {
            const tradeHour = parseInt(trade.holdingTime.split('시간')[0]) % 24;
            hourlyPnl[tradeHour] += trade.pnl;
          });
          highLossHours = hourlyPnl
            .map((pnl, hour) => ({ hour, pnl }))
            .filter((item) => item.pnl < -1000)
            .map((item) => `${item.hour}시: ${item.pnl} USDT`);
        }
      }

      // 3) 매수-매도 페어별 분석
      let pairHoldTimeString = '';
      let inefficientTrades = [];
      if (Array.isArray(pairHoldTimeData)) {
        pairHoldTimeString = pairHoldTimeData
          .map(
            (row) =>
              `${row.pair} (보유 ${row.holdingTime}, 매수가 ${row.buyPrice}, 매도가 ${row.sellPrice}, 손익 ${row.pnl})`
          )
          .join('\n');

        inefficientTrades = pairHoldTimeData
          .filter((trade) => {
            const holdTimeHours = parseFloat(trade.holdingTime) * 24;
            return holdTimeHours > 24 && trade.pnl < 0;
          })
          .map(
            (trade) =>
              `${trade.pair}: 보유 ${trade.holdingTime}, 손실 ${-trade.pnl} USDT`
          );
      }

      // 4) 단타 vs 스윙 거래 비율 계산
      let shortTermTrades = 0;
      let longTermTrades = 0;
      if (Array.isArray(pairHoldTimeData)) {
        pairHoldTimeData.forEach((trade) => {
          const holdTimeHours = parseFloat(trade.holdingTime) * 24;
          if (holdTimeHours <= 24) shortTermTrades++;
          else longTermTrades++;
        });
      }
      const shortTermRatio =
        totalTrades > 0 ? ((shortTermTrades / totalTrades) * 100).toFixed(1) : 0;
      const longTermRatio =
        totalTrades > 0 ? ((longTermTrades / totalTrades) * 100).toFixed(1) : 0;

      // 5) GPT 프롬프트 생성 (한글 지시 전용)
      const prompt = `
[개인 매매 요약 정보]
- 총 거래 횟수: ${totalTrades}회
- 평균 보유 기간: ${avgHoldDays.toFixed(1)}일
- 승률: ${winRate.toFixed(2)}%
- 최대 수익: ${maxProfit} USDT
- 최대 손실: ${maxLoss} USDT
- 최종 손익: ${finalPnl} USDT
- 단타 거래(24시간 이내) 비율: ${shortTermRatio}%
- 스윙 거래(24시간 초과) 비율: ${longTermRatio}%

[시간대별 거래 분포]
${timeDistAnalysis || '데이터 없음'}

[시간대별 주요 손실]
${highLossHours.length > 0 ? highLossHours.join('\n') : '큰 손실 없음'}

[매수-매도 페어별 보유 시간 및 손익]
${pairHoldTimeString || '데이터 없음'}

[비효율적인 거래 (장기 보유 후 손실)]
${inefficientTrades.length > 0 ? inefficientTrades.join('\n') : '없음'}

[분석 지시]
위 데이터를 기반으로 모든 응답은 반드시 한국어로 작성하세요.
영문은 절대 사용하지 마세요. 마크다운(###, ** 등) 형식 없이 일반 텍스트로 출력하세요.
단락 구분을 위해 줄바꿈만 사용하고, 보기 쉬운 구어체 문장으로 간결하게 작성하세요.
일반적인 조언보다 숫자 기반의 패턴과 문제점을 구체적으로 강조하세요.
결과는 아래 순서로 구성하세요:
👁‍🗨 인사이트 :
💥 문제점 :
💡 개선 제안 :
반드시 위의 형식을 그대로 따르세요.
      `.trim();

      // 6) GPT API 호출
      const response = await axios.post('http://localhost:8001/gpt-analysis', {
        content: prompt,
      });

      setAnalysisResult(response.data.result);
    } catch (err) {
      setAnalysisError(err.response?.data?.error || err.message);
    } finally {
      setAnalysisLoading(false);
    }
  };

  return {
    analysisResult,
    analysisLoading,
    analysisError,
    fetchAnalysis,
  };
};

export default useGptAnalysis;
