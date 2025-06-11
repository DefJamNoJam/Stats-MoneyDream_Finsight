import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Modal,
  Typography,
  CircularProgress,
  Paper,
  Divider,
  Grid,
  Card,
  CardContent,
  CardHeader,
  IconButton,
  Snackbar,
} from '@mui/material';
import {
  Timeline as TimelineIcon,
  TrendingUp as TrendingUpIcon,
  Money as MoneyIcon,
  ContentCopy as ContentCopyIcon,
} from '@mui/icons-material';
import { useGptMarketAnalysis } from '../hooks/useGptMarketAnalysis';

// 데이터 요약 함수
const calculateSummaryStats = (data, key, label) => {
  if (!data || data.length === 0) {
    return {
      label,
      latest: '데이터 없음',
      average: '데이터 없음',
      max: '데이터 없음',
      min: '데이터 없음',
      change: '데이터 없음',
      latestDate: 'N/A',
    };
  }

  const values = data.map((d) => parseFloat(d[key])).filter((v) => !isNaN(v));
  if (values.length === 0) {
    return {
      label,
      latest: '데이터 없음',
      average: '데이터 없음',
      max: '데이터 없음',
      min: '데이터 없음',
      change: '데이터 없음',
      latestDate: 'N/A',
    };
  }

  const latest = values[values.length - 1].toFixed(2);
  const average = (values.reduce((sum, v) => sum + v, 0) / values.length).toFixed(2);
  const max = Math.max(...values).toFixed(2);
  const min = Math.min(...values).toFixed(2);
  const change =
    values.length > 1
      ? (((values[values.length - 1] - values[values.length - 2]) / values[values.length - 2]) * 100).toFixed(2)
      : '데이터 부족';
  const latestDate = new Date(data[data.length - 1].time || data[data.length - 1].date).toISOString().split('T')[0];

  return { label, latest, average, max, min, change, latestDate };
};

// M2 데이터 요약 함수
const calculateM2SummaryStats = (data, label) => {
  if (!data || data.length === 0) {
    return {
      label,
      latest: '데이터 없음',
      average: '데이터 없음',
      max: '데이터 없음',
      min: '데이터 없음',
      change: '데이터 없음',
      latestDate: 'N/A',
    };
  }

  const values = data.map((d) => parseFloat(d.value)).filter((v) => !isNaN(v));
  if (values.length === 0) {
    return {
      label,
      latest: '데이터 없음',
      average: '데이터 없음',
      max: '데이터 없음',
      min: '데이터 없음',
      change: '데이터 없음',
      latestDate: 'N/A',
    };
  }

  const latest = values[values.length - 1].toFixed(2);
  const average = (values.reduce((sum, v) => sum + v, 0) / values.length).toFixed(2);
  const max = Math.max(...values).toFixed(2);
  const min = Math.min(...values).toFixed(2);
  const change =
    values.length > 1
      ? (((values[values.length - 1] - values[values.length - 2]) / values[values.length - 2]) * 100).toFixed(2)
      : '데이터 부족';
  const latestDate = new Date(data[data.length - 1].date).toISOString().split('T')[0];

  return { label, latest, average, max, min, change, latestDate };
};

// 마크다운 처리 함수
const parseMarkdown = (text) => {
  if (!text) return '';

  // 연속된 리스트 마커(-) 중복 방지
  let formatted = text
    .replace(/^한줄 요약$/gm, '<section-marker>한줄 요약</section-marker>')
    .replace(/^지표 연관성 분석$/gm, '<section-marker>지표 연관성 분석</section-marker>')
    .replace(/^투자 방향성$/gm, '<section-marker>투자 방향성</section-marker>')
    .replace(/^다음 액션$/gm, '<section-marker>다음 액션</section-marker>')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')
    .replace(/^#{1,6}\s*(.*?)$/gm, '<h4>$1</h4>')
    // 연속된 - 마커를 하나로 통합
    .replace(/^-{2,}\s*/gm, '- ')
    .replace(/^\s*-\s*(.*?)$/gm, '<li>$1</li>')
    .replace(/<li>📉\s*(.*?)<\/li>/g, '<li class="summary-item">📉 $1</li>')
    .replace(/<li>📈\s*(.*?)<\/li>/g, '<li class="correlation-item">📈 $1</li>')
    .replace(/<li>⚠️\s*(.*?)<\/li>/g, '<li class="direction-item">⚠️ $1</li>')
    .replace(/<li>🌐\s*(.*?)<\/li>/g, '<li class="action-item">🌐 $1</li>')
    .replace(/<li>(?!<)/g, '<li>• ')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.*?)__/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/_(.*?)_/g, '<em>$1</em>')
    .replace(/~~(.*?)~~/g, '<del>$1</del>')
    .trim();

  formatted = formatted
    .replace(/(<li>.*?<\/li>)\s*(<li>)/g, '$1$2')
    .replace(/(<li>.*?<\/li>)+/g, '<ul>$&</ul>')
    .replace(/<section-marker>한줄 요약<\/section-marker>/g, '<div class="section-title">한줄 요약</div>')
    .replace(/<section-marker>지표 연관성 분석<\/section-marker>/g, '<div class="section-title">지표 연관성 분석</div>')
    .replace(/<section-marker>투자 방향성<\/section-marker>/g, '<div class="section-title">투자 방향성</div>')
    .replace(/<section-marker>다음 액션<\/section-marker>/g, '<div class="section-title">다음 액션</div>')
    .replace(/\n{2,}/g, '<br>')
    .replace(/\n/g, ' ')
    .replace(/<br><br>/g, '<br>')
    .replace(/^<br>|<br>$/g, '');

  return `<div class="markdown-content">${formatted}</div>`;
};

// 분석 섹션 컴포넌트
const AnalysisSection = ({ title, icon, children }) => (
  <Card sx={{ mb: 3, boxShadow: 2 }}>
    <CardHeader
      avatar={icon}
      title={title}
      sx={{ backgroundColor: 'primary.light', color: 'primary.contrastText', py: 1 }}
    />
    <CardContent>
      <Box
        sx={{
          fontSize: '16px',
          lineHeight: 1.6,
          '& .markdown-content': { margin: 0, padding: 0 },
          '& .section-title': {
            fontWeight: 'bold',
            fontSize: '18px',
            marginTop: 1,
            marginBottom: 1,
            color: 'primary.main',
          },
          '& ul': { paddingLeft: 2, marginTop: 1, marginBottom: 1 },
          '& li': { marginBottom: 0.5 },
          '& h4': { fontSize: '17px', fontWeight: 'bold', marginTop: 1, marginBottom: 1 },
        }}
      >
        {children}
      </Box>
    </CardContent>
  </Card>
);

const modalStyle = {
  position: 'fixed',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: '80%',
  maxWidth: '1000px',
  maxHeight: '85vh',
  overflowY: 'auto',
  bgcolor: 'background.paper',
  boxShadow: 24,
  p: 3,
  borderRadius: 2,
};

const AnalysisModal = ({ open, onClose, filteredData, googleTrendData, m2Data, symbol }) => {
  const { loading, analysis, error, requestAnalysis } = useGptMarketAnalysis();
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  // 데이터 요약 계산
  const priceSummary = calculateSummaryStats(filteredData, 'close', '주가');
  const volumeSummary = calculateSummaryStats(filteredData, 'volume', '거래량');
  const trendSummary = calculateSummaryStats(googleTrendData, 'value', '구글 트렌드');
  const m2Summary = calculateM2SummaryStats(m2Data, 'M2 통화량');

  useEffect(() => {
    if (open && !loading && !analysis && !error) {
      const processedM2Data = m2Data ? (Array.isArray(m2Data) ? m2Data : m2Data.values || []) : [];
      const safeFilteredData = Array.isArray(filteredData) ? filteredData : [];
      const safeGoogleTrendData = Array.isArray(googleTrendData) ? googleTrendData : [];

      requestAnalysis({
        filteredData: safeFilteredData,
        googleTrendData: safeGoogleTrendData,
        m2Data: processedM2Data,
        symbol,
      });
    }
  }, [open, loading, analysis, error, filteredData, googleTrendData, m2Data, symbol, requestAnalysis]);

  // 분석 결과 파싱 함수 ("여기" 제거)
  const parseAnalysisResults = (analysisText) => {
    if (!analysisText) return null;

    // "여기" 텍스트 제거
    const cleanedText = analysisText.replace(/여기/g, '').trim();

    const sections = {};

    // 한줄 요약
    const summaryMatch = cleanedText.match(/한줄 요약[:\s]+(.*?)(\n|$)/i);
    sections.summary = summaryMatch ? summaryMatch[1].trim() : null;

    // 지표 연관성 분석
    const correlationMatch = cleanedText.match(/지표 연관성 분석[^]*?(?=투자 방향성|$)/i);
    sections.correlation = correlationMatch
      ? correlationMatch[0].replace(/지표 연관성 분석[:\s]+/i, '').trim()
      : null;

    // 투자 방향성
    const directionMatch = cleanedText.match(/투자 방향성[^]*?(?=다음 액션|$)/i);
    sections.direction = directionMatch
      ? directionMatch[0].replace(/투자 방향성[:\s]+/i, '').trim()
      : null;

    // 다음 액션
    const nextActionMatch = cleanedText.match(/다음 액션[^]*?(?=$)/i);
    sections.nextAction = nextActionMatch
      ? nextActionMatch[0].replace(/다음 액션[:\s]+/i, '').trim()
      : null;

    return sections;
  };

  const analysisData = analysis ? parseAnalysisResults(analysis) : null;

  // 복사 기능
  const handleCopy = () => {
    if (analysis) {
      navigator.clipboard.writeText(analysis);
      setSnackbarOpen(true);
    }
  };

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  return (
    <Modal open={open} onClose={onClose}>
      <Box sx={modalStyle}>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Typography variant="h5" fontWeight="bold" sx={{ color: '#333' }}>
            📊 {symbol} 종합 시장 분석 리포트
          </Typography>
          <Button variant="outlined" onClick={onClose} size="small">
            닫기
          </Button>
        </Box>

        <Divider sx={{ mb: 3 }} />

        {/* 데이터 요약 섹션 */}
        <Typography variant="h6" fontWeight="bold" sx={{ mb: 2, color: '#333' }}>
          📈 데이터 요약 (최근 데이터 기준)
        </Typography>
        <Grid container spacing={2} sx={{ mb: 4 }}>
          {/* 주가 요약 */}
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ boxShadow: 2 }}>
              <CardHeader
                title={priceSummary.label}
                sx={{ backgroundColor: 'primary.light', color: 'white', py: 1, fontSize: '1rem' }}
                style={{ fontSize: '1rem' }}
              />
              <CardContent>
                <Typography style={{ fontSize: '1rem'}}>최근 값: {priceSummary.latest} ({priceSummary.latestDate})</Typography>
                <Typography style={{ fontSize: '1rem'}}>평균: {priceSummary.average}</Typography>
                <Typography style={{ fontSize: '1rem'}}>최대: {priceSummary.max}</Typography>
                <Typography style={{ fontSize: '1rem'}}>최소: {priceSummary.min}</Typography>
                <Typography style={{ fontSize: '1rem'}}>
                  변동률:{' '}
                  <span
                    style={{
                      color: priceSummary.change.includes('-') ? 'red' : 'green',
                      fontWeight: 'bold',
                    }}
                  >
                    {priceSummary.change === '데이터 부족' ? priceSummary.change : `${priceSummary.change}%`}
                  </span>
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* 거래량 요약 */}
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ boxShadow: 2 }}>
              <CardHeader
                title={volumeSummary.label}
                sx={{ backgroundColor: 'primary.light', color: 'white', py: 1 }}
                style={{ fontSize: '1rem' }}
              />
              <CardContent>
                <Typography>최근 값: {volumeSummary.latest} ({volumeSummary.latestDate})</Typography>
                <Typography>평균: {volumeSummary.average}</Typography>
                <Typography>최대: {volumeSummary.max}</Typography>
                <Typography>최소: {volumeSummary.min}</Typography>
                <Typography>
                  변동률:{' '}
                  <span
                    style={{
                      color: volumeSummary.change.includes('-') ? 'red' : 'green',
                      fontWeight: 'bold',
                    }}
                  >
                    {volumeSummary.change === '데이터 부족' ? volumeSummary.change : `${volumeSummary.change}%`}
                  </span>
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* 구글 트렌드 요약 */}
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ boxShadow: 2 }}>
              <CardHeader
                title={trendSummary.label}
                sx={{ backgroundColor: 'primary.light', color: 'white', py: 1 }}
                style={{ fontSize: '1rem' }}
              />
              <CardContent>
                <Typography>최근 값: {trendSummary.latest} ({trendSummary.latestDate})</Typography>
                <Typography>평균: {trendSummary.average}</Typography>
                <Typography>최대: {trendSummary.max}</Typography>
                <Typography>최소: {trendSummary.min}</Typography>
                <Typography>
                  변동률:{' '}
                  <span
                    style={{
                      color: trendSummary.change.includes('-') ? 'red' : 'green',
                      fontWeight: 'bold',
                    }}
                  >
                    {trendSummary.change === '데이터 부족' ? trendSummary.change : `${trendSummary.change}%`}
                  </span>
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* M2 통화량 요약 */}
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ boxShadow: 2 }}>
              <CardHeader
                title={m2Summary.label}
                sx={{ backgroundColor: 'primary.light', color: 'white', py: 1, fontSize: '1rem' }}
                style={{ fontSize: '1rem' }}
              />
              <CardContent>
                <Typography>최근 값: {m2Summary.latest} ({m2Summary.latestDate})</Typography>
                <Typography>평균: {m2Summary.average}</Typography>
                <Typography>최대: {m2Summary.max}</Typography>
                <Typography>최소: {m2Summary.min}</Typography>
                <Typography>
                  변동률:{' '}
                  <span
                    style={{
                      color: m2Summary.change.includes('-') ? 'red' : 'green',
                      fontWeight: 'bold',
                    }}
                  >
                    {m2Summary.change === '데이터 부족' ? m2Summary.change : `${m2Summary.change}%`}
                  </span>
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* 분석 섹션 */}
        {loading ? (
          <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" py={6}>
            <CircularProgress size={60} />
            <Typography variant="h6" mt={3} color="text.secondary">
              GPT가 시장 데이터를 분석 중입니다...
            </Typography>
          </Box>
        ) : error ? (
          <Typography color="error">{error}</Typography>
        ) : analysisData ? (
          <>
            {analysisData.summary && (
              <Paper
                sx={{
                  p: 2,
                  mb: 3,
                  backgroundColor: '#f9d690',
                  color: 'white',
                  textAlign: 'left',
                }}
              >
                <Typography variant="h6" fontWeight="bold">
                  {analysisData.summary}
                </Typography>
              </Paper>
            )}

            <Grid container spacing={3}>
              <Grid item xs={12}>
                <AnalysisSection title="지표 연관성 분석" icon={<TimelineIcon />}>
                  <div
                    dangerouslySetInnerHTML={{
                      __html: parseMarkdown(analysisData.correlation || '정보 부족'),
                    }}
                  />
                </AnalysisSection>
              </Grid>

              <Grid item xs={12} md={6}>
                <AnalysisSection title="투자 방향성" icon={<TrendingUpIcon />}>
                  <div
                    dangerouslySetInnerHTML={{
                      __html: parseMarkdown(analysisData.direction || '정보 부족'),
                    }}
                  />
                </AnalysisSection>
              </Grid>

              <Grid item xs={12} md={6}>
                <AnalysisSection title="다음 액션" icon={<MoneyIcon />}>
                  <Box>
                    <div
                      dangerouslySetInnerHTML={{
                        __html: parseMarkdown(analysisData.nextAction || '정보 부족'),
                      }}
                    />
                  </Box>
                </AnalysisSection>
              </Grid>
            </Grid>

            <Card sx={{ mt: 3, boxShadow: 2 }}>
              <CardHeader
                title="전체 분석 내용"
                sx={{ backgroundColor: 'grey.100', py: 1 }}
                action={
                  <IconButton onClick={handleCopy}>
                    <ContentCopyIcon />
                  </IconButton>
                }
              />
              <CardContent>
                <Box
                  sx={{
                    '& br': { display: 'block', marginTop: '0.2em' },
                  }}
                >
                  <div
                    dangerouslySetInnerHTML={{ __html: parseMarkdown(analysis || '') }}
                    style={{
                      whiteSpace: 'pre-wrap',
                      maxHeight: '250px',
                      overflowY: 'auto',
                      fontSize: '16px',
                      lineHeight: 1.2,
                    }}
                  />
                </Box>
              </CardContent>
            </Card>
          </>
        ) : (
          <Typography>분석 데이터가 없습니다.</Typography>
        )}

        <Snackbar
          open={snackbarOpen}
          autoHideDuration={3000}
          onClose={handleSnackbarClose}
          message="분석 내용이 복사되었습니다!"
        />
      </Box>
    </Modal>
  );
};

export default AnalysisModal;