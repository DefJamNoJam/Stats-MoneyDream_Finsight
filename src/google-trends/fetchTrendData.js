// src/google-trends/fetchTrendData.js
import { supabase } from '../supabase/supabaseClient';

/**
 * 구글 트렌드 데이터 가져오기
 * @param {string} keyword ex) 'bitcoin'
 * @param {string} granularity ex) 'monthly', 'weekly'
 * @param {string} startDate 'YYYY-MM-DD'
 * @param {string} endDate 'YYYY-MM-DD'
 * @returns {Promise<Array>} [{ date: '2024-01-01', value: 50 }, ...]
 */
export async function fetchGoogleTrends(keyword, granularity, startDate, endDate) {
  const { data, error } = await supabase
    .from('google_trends')
    .select('date, value')
    .eq('keyword', keyword)
    .eq('granularity', granularity)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true });

  if (error) {
    console.error('❌ Supabase fetch error:', error);
    return [];
  }

  return data;
}
