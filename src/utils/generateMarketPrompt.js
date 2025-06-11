// src/utils/generateMarketPrompt.js
export const generatePromptSet = (filteredData, googleTrendData, m2Data, symbol) => {
  if (
    !filteredData?.length ||
    !googleTrendData?.length ||
    !m2Data?.values?.length
  ) {
    console.warn('프롬프트 생성 실패: 데이터 부족');
    return [];
  }

  // 데이터 요약 (최근 10개 데이터만 사용)
  const priceSummary = filteredData.slice(-10).map((d) => ({
    date: d.time.toISOString().split('T')[0],
    close: d.close,
    volume: d.volume,
  }));

  const trendSummary = googleTrendData.slice(-10).map((d) => ({
    date: d.date,
    value: parseFloat(d.value),
  }));

  const m2Summary = m2Data.values.slice(-10).map((value, i) => ({
    date: m2Data.dates ? m2Data.dates[i] : new Date(2023, i).toISOString().split('T')[0],
    value,
  }));

  // Step 1: 데이터 요약 프롬프트
  const step1Prompt = `
  다음 데이터를 요약해주세요:
  - 종목: ${symbol}
  - 주가 데이터 (최근 10개): ${JSON.stringify(priceSummary)}
  - 구글 트렌드 데이터 (최근 10개): ${JSON.stringify(trendSummary)}
  - M2 통화량 데이터 (최근 10개): ${JSON.stringify(m2Summary)}
  각 데이터의 최근 추세를 간단히 설명해주세요.
  `;

  // Step 2: 지표 연관성 분석 프롬프트
  const step2Prompt = `
  다음 데이터를 바탕으로 주가, 구글 트렌드, 거래량, M2 통화량 간의 연관성을 분석해주세요:
  - 주가 데이터 (최근 10개): ${JSON.stringify(priceSummary)}
  - 구글 트렌드 데이터 (최근 10개): ${JSON.stringify(trendSummary)}
  - M2 통화량 데이터 (최근 10개): ${JSON.stringify(m2Summary)}
  연관성 분석 결과를 상세히 설명해주세요.
  `;

  // Step 3: 최종 분석 프롬프트
  const step3Prompt = `
  이전 분석 결과를 바탕으로 다음을 작성해주세요:
  1. 한줄 요약: 현재 시장 상황과 투자 판단을 간결히 요약
  2. 지표 연관성 분석: 주가, 구글 트렌드, 거래량, M2 통화량의 상관관계와 의미
  3. 투자 방향성: 현재 데이터를 바탕으로 한 투자 전략과 방향
  4. 다음 액션: 투자자가 취해야 할 구체적인 행동 제안
  `;

  // 프롬프트 길이 확인 및 디버깅
  console.log('프롬프트 길이 체크:', {
    step1: step1Prompt.length,
    step2: step2Prompt.length,
    step3: step3Prompt.length,
  });

  return [step1Prompt, step2Prompt, step3Prompt];
};