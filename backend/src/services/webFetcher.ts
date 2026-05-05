/**
 * 网页抓取服务 —— 从 URL 提取可读文本内容
 *
 * 用于当用户发送链接时，自动抓取网页内容注入 AI 上下文
 */

import * as cheerio from 'cheerio';

// ── URL 提取正则 ──
const URL_REGEX = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi;

// ── 最大内容长度（字符）──
const MAX_CONTENT_LENGTH = 8000;

export interface FetchResult {
  success: boolean;
  url: string;
  title?: string;
  text?: string;
  error?: string;
  truncated?: boolean;
}

/**
 * 从纯文本中提取所有 URL
 */
export function extractUrls(text: string): string[] {
  const matches = text.match(URL_REGEX);
  if (!matches) return [];
  // 去重
  return [...new Set(matches)];
}

/**
 * 从 HTML 中提取可读文本
 */
function extractTextFromHtml(html: string): { title: string; text: string } {
  const $ = cheerio.load(html);

  // 提取标题
  const title =
    $('meta[property="og:title"]').attr('content') ||
    $('meta[name="twitter:title"]').attr('content') ||
    $('title').text() ||
    '';

  // 移除不相关内容
  $('script, style, noscript, iframe, svg, nav, footer, header, aside, .sidebar, .nav, .footer, .header, .menu, .advertisement').remove();

  // 从 body 提取文本（如果存在），否则从整个文档提取
  const body = $('body').length ? $('body') : $('html');
  let text = body
    .text()
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return { title: title.trim(), text };
}

/**
 * 抓取单个 URL 并提取文本
 */
export async function fetchUrl(url: string): Promise<FetchResult> {
  // 确保有协议前缀
  if (!/^https?:\/\//i.test(url)) {
    url = 'https://' + url;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      },
      redirect: 'follow',
    });

    if (!response.ok) {
      return { success: false, url, error: `HTTP ${response.status} ${response.statusText}` };
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
      return { success: false, url, error: `不支持的内容类型: ${contentType}` };
    }

    const html = await response.text();
    const { title, text } = extractTextFromHtml(html);

    let truncated = false;
    let finalText = text;
    if (finalText.length > MAX_CONTENT_LENGTH) {
      finalText = finalText.slice(0, MAX_CONTENT_LENGTH) + '\n\n[内容已截断，完整内容请访问原链接]';
      truncated = true;
    }

    return { success: true, url, title, text: finalText, truncated };
  } catch (err: any) {
    return {
      success: false,
      url,
      error: err.name === 'AbortError' ? '请求超时' : (err.message || '未知错误'),
    };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * 批量抓取多个 URL，返回格式化的文本块
 */
export async function fetchAndFormatUrls(urls: string[]): Promise<string | null> {
  if (urls.length === 0) return null;

  const results = await Promise.all(urls.map(fetchUrl));
  const blocks: string[] = [];

  for (const r of results) {
    if (r.success && r.text) {
      const header = r.title ? `📄 ${r.title}` : `📄 ${r.url}`;
      blocks.push(
        `\n--- 网页内容: ${r.url} ---\n${header}\n\n${r.text}\n--- 网页内容结束 ---\n`
      );
    } else {
      blocks.push(`\n[链接无法抓取: ${r.url} (${r.error || '未知原因'})]\n`);
    }
  }

  return blocks.join('');
}

/**
 * 从消息内容中提取 URL 并抓取网页内容
 * 返回追加到消息末尾的文本（用于注入 AI 上下文）
 */
export async function enrichMessageWithUrls(content: string): Promise<{ enrichedContent: string; fetchedUrls: string[] }> {
  const urls = extractUrls(content);
  if (urls.length === 0) {
    return { enrichedContent: content, fetchedUrls: [] };
  }

  const fetchedBlock = await fetchAndFormatUrls(urls);
  if (!fetchedBlock) {
    return { enrichedContent: content, fetchedUrls: [] };
  }

  return {
    enrichedContent: content + '\n\n' + fetchedBlock,
    fetchedUrls: urls,
  };
}
