import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import mammoth from 'mammoth';
import pdfParse from 'pdf-parse';
import mimeTypes from 'mime-types';

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
  description: 'Parse contract files (PDF, DOCX, DOC, TXT) and extract text content for audit',
  inputSchema: z.object({
    fileBuffer: z.instanceof(Buffer).describe('File buffer data'),
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
  fileBuffer: Buffer,
  fileName: string,
  mimeType?: string
): Promise<FileParseResult> => {
  try {
    // 检测文件类型
    const detectedMimeType = mimeType || mimeTypes.lookup(fileName) || '';
    const fileExtension = fileName.split('.').pop()?.toLowerCase() || '';
    
    // 验证文件大小 (限制为10MB)
    const maxFileSize = 10 * 1024 * 1024; // 10MB
    if (fileBuffer.length > maxFileSize) {
      throw new Error(`文件大小超过限制 (${Math.round(fileBuffer.length / 1024 / 1024)}MB > 10MB)`);
    }

    let extractedContent = '';
    let pageCount: number | undefined;

    // 根据文件类型选择解析方法
    switch (detectedMimeType) {
      case SupportedFileTypes.PDF:
        const pdfResult = await parsePDF(fileBuffer);
        extractedContent = pdfResult.content;
        pageCount = pdfResult.pageCount;
        break;

      case SupportedFileTypes.DOCX:
        extractedContent = await parseDOCX(fileBuffer);
        break;

      case SupportedFileTypes.DOC:
        // DOC文件需要特殊处理，这里先尝试用mammoth解析
        try {
          extractedContent = await parseDOCX(fileBuffer);
        } catch (error) {
          throw new Error('DOC文件格式不支持，请转换为DOCX格式');
        }
        break;

      case SupportedFileTypes.TXT:
        extractedContent = fileBuffer.toString('utf-8');
        break;

      default:
        // 尝试根据文件扩展名推断
        if (['pdf'].includes(fileExtension)) {
          const pdfResult = await parsePDF(fileBuffer);
          extractedContent = pdfResult.content;
          pageCount = pdfResult.pageCount;
        } else if (['docx'].includes(fileExtension)) {
          extractedContent = await parseDOCX(fileBuffer);
        } else if (['doc'].includes(fileExtension)) {
          try {
            extractedContent = await parseDOCX(fileBuffer);
          } catch (error) {
            throw new Error('DOC文件格式不支持，请转换为DOCX格式');
          }
        } else if (['txt'].includes(fileExtension)) {
          extractedContent = fileBuffer.toString('utf-8');
        } else {
          throw new Error(`不支持的文件类型: ${detectedMimeType || fileExtension}。支持的格式: PDF, DOCX, TXT`);
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
        fileSize: fileBuffer.length,
        pageCount,
        wordCount,
        extractedAt: new Date().toISOString(),
      },
      success: true,
    };

  } catch (error) {
    console.error('文件解析错误:', error);
    
    return {
      content: '',
      metadata: {
        fileName,
        fileType: mimeType || 'unknown',
        fileSize: fileBuffer.length,
        wordCount: 0,
        extractedAt: new Date().toISOString(),
      },
      success: false,
      error: error instanceof Error ? error.message : '文件解析失败',
    };
  }
};

// PDF解析函数
const parsePDF = async (buffer: Buffer): Promise<{ content: string; pageCount: number }> => {
  try {
    const data = await pdfParse(buffer, {
      // PDF解析选项
      max: 0, // 解析所有页面
      version: 'default',
    });

    return {
      content: data.text,
      pageCount: data.numpages,
    };
  } catch (error) {
    throw new Error(`PDF解析失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
};

// DOCX解析函数
const parseDOCX = async (buffer: Buffer): Promise<string> => {
  try {
    const result = await mammoth.extractRawText({ buffer });
    
    if (result.messages && result.messages.length > 0) {
      console.warn('DOCX解析警告:', result.messages);
    }

    return result.value;
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
    .replace(/['']/g, "'");
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
  const detectedMimeType = mimeType || mimeTypes.lookup(fileName);
  
  const supportedExtensions = ['pdf', 'docx', 'doc', 'txt'];
  const supportedMimeTypes = Object.values(SupportedFileTypes);
  
  return (
    (extension && supportedExtensions.includes(extension)) ||
    (detectedMimeType && supportedMimeTypes.includes(detectedMimeType as any))
  );
};

// 获取支持的文件类型列表
export const getSupportedFileTypes = () => {
  return {
    extensions: ['pdf', 'docx', 'doc', 'txt'],
    mimeTypes: Object.values(SupportedFileTypes),
    maxFileSize: '10MB',
  };
};