// src/utils/stripMarkdown.js
export const stripMarkdown = (text) =>
    text
      .replace(/```[\s\S]*?```/g, '')             // 코드블럭 제거
      .replace(/!\[.*?\]\(.*?\)/g, '')            // 이미지 제거
      .replace(/\[(.*?)\]\(.*?\)/g, '$1')         // 링크 제거
      .replace(/#+\s?/g, '')                      // 헤더 제거 (#, ## 등)
      .replace(/[-*]\s/g, '')                     // 리스트 마크 제거 (-, *)
      .replace(/\*\*(.*?)\*\*/g, '$1')            // **볼드** 제거
      .replace(/__(.*?)__/g, '$1')                // __볼드__ 제거
      .replace(/_(.*?)_/g, '$1')                  // _이탤릭_ 제거
      .replace(/~~(.*?)~~/g, '$1')                // ~취소선~ 제거
      .replace(/<\/?[^>]+(>|$)/g, '')             // HTML 태그 제거
      .trim();
  