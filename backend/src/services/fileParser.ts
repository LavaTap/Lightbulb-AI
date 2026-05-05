/**
 * 文件解析服务 —— 将各种文档格式解析为纯文本
 *
 * 支持的格式：
 *   - .docx (Word)      → mammoth
 *   - .pdf              → pdf-parse
 *   - .xlsx / .xls      → xlsx
 *   - 文本文件 (.txt/.md/.py/.js/...) → UTF-8 直接解码
 */

import mammoth from 'mammoth';

// ── 判断是否为文本文件 ──
const TEXT_MIME_PREFIXES = [
  'text/',
  'application/json',
  'application/xml',
  'application/javascript',
  'application/x-httpd-php',
];
const TEXT_EXTENSIONS = [
  '.md', '.txt', '.csv', '.log', '.yaml', '.yml', '.toml', '.ini',
  '.cfg', '.conf', '.env', '.sh', '.bash', '.zsh', '.ps1', '.bat',
  '.py', '.js', '.ts', '.tsx', '.jsx', '.html', '.css', '.scss', '.less',
  '.svg', '.json', '.xml', '.java', '.c', '.cpp', '.h', '.hpp', '.go',
  '.rs', '.rb', '.php', '.swift', '.kt', '.scala', '.sql', '.r', '.m', '.lua',
];

export interface ParseResult {
  success: boolean;
  text?: string;
  error?: string;
}

export function isTextFile(fileName: string, mimeType?: string): boolean {
  const mime = (mimeType || '').toLowerCase();
  const name = (fileName || '').toLowerCase();

  if (TEXT_MIME_PREFIXES.some(p => mime.startsWith(p))) return true;

  const ext = name.includes('.') ? '.' + (name.split('.').pop() || '') : '';
  if (TEXT_EXTENSIONS.includes(ext)) return true;

  return false;
}

// ── 解析 .docx ──
async function parseDocx(buffer: Buffer): Promise<ParseResult> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return { success: true, text: result.value };
  } catch (err) {
    console.error('[fileParser] mammoth parse error:', err);
    return { success: false, error: 'Word 文档解析失败' };
  }
}

// ── 解析 .pdf ──
async function parsePdf(buffer: Buffer): Promise<ParseResult> {
  try {
    const { PDFParse } = await import('pdf-parse');
    // pdf-parse v2 是类，需要 new 然后调用 getText()
    const pdf = new PDFParse({ data: buffer });
    const result = await pdf.getText();
    return { success: true, text: result.text };
  } catch (err) {
    console.error('[fileParser] pdf-parse error:', err);
    return { success: false, error: 'PDF 文档解析失败' };
  }
}

// ── 解析 .xlsx/.xls ──
async function parseXlsx(buffer: Buffer): Promise<ParseResult> {
  try {
    const XLSX = (await import('xlsx')).default;
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const lines: string[] = [];
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const csv = XLSX.utils.sheet_to_csv(sheet, { strip: false });
      lines.push(`## ${sheetName}`, '', csv);
    }
    return { success: true, text: lines.join('\n') };
  } catch (err) {
    console.error('[fileParser] xlsx parse error:', err);
    return { success: false, error: 'Excel 表格解析失败' };
  }
}

// ── 解析纯文本 ──
function parseTextFile(buffer: Buffer): ParseResult {
  try {
    return { success: true, text: buffer.toString('utf-8') };
  } catch (err) {
    console.error('[fileParser] text decode error:', err);
    return { success: false, error: '文本编码解析失败' };
  }
}

// ── 根据扩展名路由到对应解析器 ──
export async function parseFileContent(
  buffer: Buffer,
  fileName: string,
  mimeType?: string,
): Promise<ParseResult> {
  const ext = fileName.includes('.')
    ? ('.' + (fileName.split('.').pop() || '')).toLowerCase()
    : '';

  // .docx
  if (
    ext === '.docx' ||
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.template'
  ) {
    return parseDocx(buffer);
  }

  // .pdf
  if (ext === '.pdf' || mimeType === 'application/pdf') {
    return parsePdf(buffer);
  }

  // .xlsx / .xls
  if (
    ext === '.xlsx' || ext === '.xls' || ext === '.numbers' ||
    mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    mimeType === 'application/vnd.ms-excel'
  ) {
    return parseXlsx(buffer);
  }

  // 文本文件
  if (isTextFile(fileName, mimeType)) {
    return parseTextFile(buffer);
  }

  // 不支持的二进制格式
  return {
    success: false,
    error: `不支持的文件格式（${ext || mimeType || '未知类型'}），目前支持 .docx / .pdf / .xlsx / 纯文本文件`,
  };
}
