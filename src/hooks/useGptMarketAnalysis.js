import { useState, useEffect } from 'react';
import axios from 'axios';
import { generatePromptSet } from '../utils/generateMarketPrompt';

export const useGptMarketAnalysis = () => {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState('');
  const [error, setError] = useState('');

  // 상태 변화 감지 (디버깅 용)
  useEffect(() => {
    console.log('Analysis 상태 변경:', analysis);
  }, [analysis]);

  useEffect(() => {
    console.log('Error 상태 변경:', error);
  }, [error]);

  useEffect(() => {
    console.log('Loading 상태 변경:', loading);
  }, [loading]);

  const callGpt = async (prompt) => {
    try {
      const res = await axios.post('http://localhost:8001/gpt-analysis', { content: prompt }, { timeout: 120000 });
      console.log('GPT 서버 응답:', res.data);
      if (!res.data || typeof res.data !== 'object' || !res.data.result) {
        console.warn('⚠️ GPT 응답 result 누락:', res.data); // 디버깅
        throw new Error('서버 응답 형식이 올바르지 않거나 result 필드가 누락되었습니다.');
      }
      return res.data.result;
    } catch (err) {
      console.error('callGpt 오류:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
      });
      throw err;
    }
  };

  const requestAnalysis = async ({ filteredData, googleTrendData, m2Data, symbol }) => {
    setLoading(true);
    setError('');
    setAnalysis('');

    const m2Values = Array.isArray(m2Data)
      ? m2Data.map((d) => d.value)
      : Array.isArray(m2Data?.values)
      ? m2Data.values
      : [];

    console.log('GPT 분석 요청 - 입력 데이터:', { 
      filteredDataLength: filteredData?.length, 
      googleTrendDataLength: googleTrendData?.length, 
      m2DataValuesLength: m2Values?.length, 
      symbol 
    });

    try {
      const prompts = generatePromptSet(filteredData, googleTrendData, { values: m2Values }, symbol);
      if (!prompts || prompts.length !== 3) {
        throw new Error('⚠️ 데이터가 부족합니다.');
      }
      console.log('Generated Prompts:', prompts);

      // 👇 병렬 호출 → 직렬 호출로 변경
      const step1 = await callGpt(prompts[0]);
      console.log('Step1 GPT Result:', step1);

      const step2 = await callGpt(prompts[1]);
      console.log('Step2 GPT Result:', step2);

      const finalPrompt = `${step1}\n\n${step2}\n\n${prompts[2]}`;
      console.log('Final Prompt:', finalPrompt);

      const finalResult = await callGpt(finalPrompt);
      console.log('Final GPT Result:', finalResult);

      setAnalysis(finalResult);
      console.log('Analysis 상태 업데이트:', finalResult); 
      // 디버깅
    } catch (err) {
      console.error('GPT 분석 오류:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
      });
      setError(`GPT 분석 실패: ${err.response?.data?.detail || err.message || '알 수 없는 오류'}`);
    } finally {
      setLoading(false);
    }
  };

  return { loading, analysis, error, requestAnalysis };
};
