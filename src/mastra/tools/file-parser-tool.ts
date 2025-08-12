import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

// 支持的文件类型
const SupportedFileTypes = {
  PDF: 'application/pdf',
  DOCX: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  DOC: 'application/msword',
  TXT: 'text/plain',
} as const;

// 文件处理结果接口
interface FileParseResult {
  content: string;
  metadata: {
    fileName: string;
    fileType: string;
    fileSize: number;
    pageCount?: number;
    wordCount: number;
    extractedAt: string;
  };
  success: boolean;
  error?: string;
}

export const fileParserTool = createTool({
  id: 'parse-contract-file',
  description: 'Parse contract files and extract text content for audit (Cloudflare Workers compatible)',
  inputSchema: z.object({
    fileBuffer: z.instanceof(ArrayBuffer).or(z.instanceof(Buffer)).describe('File buffer data'),
    fileName: z.string().describe('Original file name with extension'),
    mimeType: z.string().optional().describe('MIME type of the file'),
  }),
  outputSchema: z.object({
    content: z.string(),
    metadata: z.object({
      fileName: z.string(),
      fileType: z.string(),
      fileSize: z.number(),
      pageCount: z.number().optional(),
      wordCount: z.number(),
      extractedAt: z.string(),
    }),
    success: z.boolean(),
    error: z.string().optional(),
  }),
  execute: async ({ context }) => {
    return await parseContractFile(
      context.fileBuffer,
      context.fileName,
      context.mimeType
    );
  },
});

const parseContractFile = async (
  fileBuffer: ArrayBuffer | Buffer,
  fileName: string,
  mimeType?: string
): Promise<FileParseResult> => {
  try {
    // 转换Buffer为ArrayBuffer（如果需要）
    const arrayBuffer = fileBuffer instanceof ArrayBuffer 
      ? fileBuffer 
      : fileBuffer.buffer.slice(fileBuffer.byteOffset, fileBuffer.byteOffset + fileBuffer.byteLength);

    // 检测文件类型
    const detectedMimeType = mimeType || detectMimeType(fileName, arrayBuffer);
    const fileExtension = fileName.split('.').pop()?.toLowerCase() || '';
    
    // 验证文件大小 (限制为10MB)
    const maxFileSize = 10 * 1024 * 1024; // 10MB
    if (arrayBuffer.byteLength > maxFileSize) {
      throw new Error(`文件大小超过限制 (${Math.round(arrayBuffer.byteLength / 1024 / 1024)}MB > 10MB)`);
    }

    let extractedContent = '';
    let pageCount: number | undefined;

    // 根据文件类型选择解析方法
    switch (detectedMimeType) {
      case SupportedFileTypes.PDF:
        // PDF解析（简化版，适用于Cloudflare Workers）
        const pdfResult = await parsePDFSimple(arrayBuffer);
        extractedContent = pdfResult.content;
        pageCount = pdfResult.pageCount;
        break;

      case SupportedFileTypes.DOCX:
        // DOCX解析（需要第三方API或简化处理）
        extractedContent = await parseDOCXSimple(arrayBuffer);
        break;

      case SupportedFileTypes.DOC:
        throw new Error('DOC文件格式在此环境下不支持，请转换为DOCX或PDF格式');

      case SupportedFileTypes.TXT:
        // 文本文件直接解码
        const decoder = new TextDecoder('utf-8');
        extractedContent = decoder.decode(arrayBuffer);
        break;

      default:
        // 尝试根据文件扩展名推断
        if (['pdf'].includes(fileExtension)) {
          const pdfResult = await parsePDFSimple(arrayBuffer);
          extractedContent = pdfResult.content;
          pageCount = pdfResult.pageCount;
        } else if (['txt'].includes(fileExtension)) {
          const decoder = new TextDecoder('utf-8');
          extractedContent = decoder.decode(arrayBuffer);
        } else {
          throw new Error(`不支持的文件类型: ${detectedMimeType || fileExtension}。在当前环境支持的格式: PDF, TXT。如需处理DOCX文件，请先转换为PDF或TXT格式。`);
        }
    }

    // 清理和验证提取的内容
    extractedContent = cleanExtractedContent(extractedContent);
    
    if (!extractedContent || extractedContent.trim().length < 50) {
      throw new Error('无法从文件中提取到足够的文本内容，请检查文件是否损坏或为空');
    }

    // 计算词汇数量
    const wordCount = countWords(extractedContent);

    return {
      content: extractedContent,
      metadata: {
        fileName,
        fileType: detectedMimeType || `file/${fileExtension}`,
        fileSize: arrayBuffer.byteLength,
        pageCount,
        wordCount,
        extractedAt: new Date().toISOString(),
      },
      success: true,
    };

  } catch (error) {
    console.error('文件解析错误:', error);
    
    const bufferSize = fileBuffer instanceof ArrayBuffer 
      ? fileBuffer.byteLength 
      : fileBuffer.length;
    
    return {
      content: '',
      metadata: {
        fileName,
        fileType: mimeType || 'unknown',
        fileSize: bufferSize,
        wordCount: 0,
        extractedAt: new Date().toISOString(),
      },
      success: false,
      error: error instanceof Error ? error.message : '文件解析失败',
    };
  }
};

// 简化的MIME类型检测
const detectMimeType = (fileName: string, arrayBuffer: ArrayBuffer): string => {
  const extension = fileName.split('.').pop()?.toLowerCase();
  const uint8Array = new Uint8Array(arrayBuffer);
  
  // 检查文件头魔数
  if (uint8Array.length >= 4) {
    // PDF文件头：%PDF
    if (uint8Array[0] === 0x25 && uint8Array[1] === 0x50 && 
        uint8Array[2] === 0x44 && uint8Array[3] === 0x46) {
      return SupportedFileTypes.PDF;
    }
    
    // DOCX文件头：PK (ZIP格式)
    if (uint8Array[0] === 0x50 && uint8Array[1] === 0x4B) {
      return SupportedFileTypes.DOCX;
    }
  }
  
  // 根据扩展名推断
  switch (extension) {
    case 'pdf':
      return SupportedFileTypes.PDF;
    case 'docx':
      return SupportedFileTypes.DOCX;
    case 'doc':
      return SupportedFileTypes.DOC;
    case 'txt':
      return SupportedFileTypes.TXT;
    default:
      return 'unknown';
  }
};

// 简化的PDF解析（适用于Cloudflare Workers）
const parsePDFSimple = async (arrayBuffer: ArrayBuffer): Promise<{ content: string; pageCount: number }> => {
  try {
    // 基础PDF文本提取（不依赖Node.js文件系统）
    const uint8Array = new Uint8Array(arrayBuffer);
    const decoder = new TextDecoder('latin1');
    let pdfText = decoder.decode(uint8Array);
    
    // 简单的PDF文本提取正则表达式
    const textRegex = /BT\s+(.*?)\s+ET/gs;
    const streamRegex = /stream\s+([\s\S]*?)\s+endstream/gs;
    
    let extractedText = '';
    let matches;
    
    // 提取BT...ET之间的文本
    while ((matches = textRegex.exec(pdfText)) !== null) {
      let textContent = matches[1];
      // 移除PDF操作符
      textContent = textContent.replace(/\[\(([^)]*)\)\]\s*TJ/g, '$1');
      textContent = textContent.replace(/\(([^)]*)\)\s*Tj/g, '$1');
      textContent = textContent.replace(/\(([^)]*)\)\s*'/g, '$1');
      extractedText += textContent + ' ';
    }
    
    // 如果没有找到文本，尝试从流中提取
    if (!extractedText.trim()) {
      while ((matches = streamRegex.exec(pdfText)) !== null) {
        const streamContent = matches[1];
        // 简单的文本提取
        const visibleText = streamContent.replace(/[^\x20-\x7E\u4e00-\u9fff]/g, ' ');
        extractedText += visibleText + ' ';
      }
    }
    
    // 估算页数
    const pageCount = (pdfText.match(/\/Type\s*\/Page[^s]/g) || []).length || 1;
    
    // 如果仍然没有提取到文本，返回提示
    if (!extractedText.trim()) {
      extractedText = '注意：PDF文件可能包含图像或复杂格式，无法在当前环境下完全解析。建议使用专业PDF转换工具转换为文本格式后重新上传。';
    }
    
    return {
      content: extractedText.trim(),
      pageCount,
    };
  } catch (error) {
    throw new Error(`PDF解析失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
};

// 简化的DOCX解析（适用于Cloudflare Workers）
const parseDOCXSimple = async (arrayBuffer: ArrayBuffer): Promise<string> => {
  try {
    // 基础DOCX文本提取（不依赖mammoth库）
    const uint8Array = new Uint8Array(arrayBuffer);
    const decoder = new TextDecoder('utf-8');
    
    // DOCX是ZIP格式，这里只能做基本的文本搜索
    let content = '';
    try {
      content = decoder.decode(uint8Array);
    } catch {
      // 如果UTF-8解码失败，尝试其他编码
      const latin1Decoder = new TextDecoder('latin1');
      content = latin1Decoder.decode(uint8Array);
    }
    
    // 简单的XML文本提取
    const textRegex = /<w:t[^>]*>([^<]*)<\/w:t>/g;
    const paragraphRegex = /<w:p[^>]*>([\s\S]*?)<\/w:p>/g;
    
    let extractedText = '';
    let matches;
    
    // 提取段落中的文本
    while ((matches = paragraphRegex.exec(content)) !== null) {
      const paragraphContent = matches[1];
      let paragraphText = '';
      
      const textMatches = paragraphContent.matchAll(textRegex);
      for (const textMatch of textMatches) {
        paragraphText += textMatch[1] + ' ';
      }
      
      if (paragraphText.trim()) {
        extractedText += paragraphText.trim() + '\n';
      }
    }
    
    // 如果没有找到段落，直接搜索文本标签
    if (!extractedText.trim()) {
      while ((matches = textRegex.exec(content)) !== null) {
        extractedText += matches[1] + ' ';
      }
    }
    
    // 如果仍然没有提取到文本，返回提示
    if (!extractedText.trim()) {
      extractedText = '注意：DOCX文件可能包含复杂格式或图像，无法在当前环境下完全解析。建议将文件另存为TXT格式或转换为PDF后重新上传。';
    }
    
    return extractedText.trim();
  } catch (error) {
    throw new Error(`DOCX解析失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
};

// 清理提取的文本内容
const cleanExtractedContent = (content: string): string => {
  return content
    // 移除多余的空白字符
    .replace(/\s+/g, ' ')
    // 移除多余的换行符
    .replace(/\n{3,}/g, '\n\n')
    // 移除开头和结尾的空白
    .trim()
    // 移除常见的PDF/DOCX提取噪音
    .replace(/Page \d+ of \d+/gi, '')
    .replace(/^\d+\s*$/gm, '') // 移除单独的页码行
    .replace(/\f/g, '') // 移除换页符
    // 标准化引号
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'")
    // 移除PDF特殊字符
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x84\x86-\x9F]/g, '');
};

// 计算词汇数量
const countWords = (text: string): number => {
  // 中英文混合计数
  const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  const englishWords = (text.match(/[a-zA-Z]+/g) || []).length;
  
  // 中文字符按字符计数，英文按单词计数
  return chineseChars + englishWords;
};

// 验证文件类型的辅助函数
export const validateFileType = (fileName: string, mimeType?: string): boolean => {
  const extension = fileName.split('.').pop()?.toLowerCase();
  const detectedMimeType = mimeType || detectMimeType(fileName, new ArrayBuffer(0));
  
  const supportedExtensions = ['pdf', 'txt']; // 在Cloudflare Workers环境下限制支持的格式
  const supportedMimeTypes = [SupportedFileTypes.PDF, SupportedFileTypes.TXT];
  
  return (
    (extension && supportedExtensions.includes(extension)) ||
    (detectedMimeType && supportedMimeTypes.includes(detectedMimeType as any))
  );
};

// 获取支持的文件类型列表
export const getSupportedFileTypes = () => {
  return {
    extensions: ['pdf', 'txt'], // Cloudflare Workers环境限制
    mimeTypes: [SupportedFileTypes.PDF, SupportedFileTypes.TXT],
    maxFileSize: '10MB',
    note: '在Cloudflare Workers环境下，DOCX文件支持有限。建议转换为PDF或TXT格式以获得更好的解析效果。'
  };
};