import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { fileParserTool, validateFileType } from './file-parser-tool';

// 合同类型枚举
enum ContractType {
  VISUALIZATION_DASHBOARD = 'visualization_dashboard',
  SOFTWARE_LICENSE = 'software_license',
  SERVICE_AGREEMENT = 'service_agreement',
  MAINTENANCE = 'maintenance',
  DATA_PROCESSING = 'data_processing'
}

// 风险等级枚举
enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// 合规检查项目
interface ComplianceCheckItem {
  category: string;
  requirement: string;
  status: 'pass' | 'fail' | 'warning';
  description: string;
  recommendation?: string;
}

// 文件审核结果接口
interface FileAuditResult {
  contractId: string;
  contractType: ContractType;
  overallRiskLevel: RiskLevel;
  complianceScore: number;
  complianceChecks: ComplianceCheckItem[];
  summary: string;
  criticalIssues: string[];
  recommendations: string[];
  auditTimestamp: string;
  fileMetadata: {
    fileName: string;
    fileType: string;
    fileSize: number;
    pageCount?: number;
    wordCount: number;
    extractedAt: string;
  };
  extractedContent?: string; // 可选，用于调试
}

export const contractFileAuditTool = createTool({
  id: 'audit-contract-file',
  description: 'Audit contract files (PDF, TXT) for compliance with visualization dashboard requirements (Cloudflare Workers compatible)',
  inputSchema: z.object({
    fileBuffer: z.instanceof(ArrayBuffer).or(z.instanceof(Buffer)).describe('Contract file buffer data'),
    fileName: z.string().describe('Original file name with extension'),
    contractType: z.nativeEnum(ContractType).describe('Type of contract being audited'),
    contractId: z.string().optional().describe('Contract identifier'),
    companyName: z.string().optional().describe('Company name for context'),
    mimeType: z.string().optional().describe('MIME type of the file'),
    includeExtractedContent: z.boolean().optional().default(false).describe('Include extracted content in result'),
  }),
  outputSchema: z.object({
    contractId: z.string(),
    contractType: z.nativeEnum(ContractType),
    overallRiskLevel: z.nativeEnum(RiskLevel),
    complianceScore: z.number(),
    complianceChecks: z.array(z.object({
      category: z.string(),
      requirement: z.string(),
      status: z.enum(['pass', 'fail', 'warning']),
      description: z.string(),
      recommendation: z.string().optional(),
    })),
    summary: z.string(),
    criticalIssues: z.array(z.string()),
    recommendations: z.array(z.string()),
    auditTimestamp: z.string(),
    fileMetadata: z.object({
      fileName: z.string(),
      fileType: z.string(),
      fileSize: z.number(),
      pageCount: z.number().optional(),
      wordCount: z.number(),
      extractedAt: z.string(),
    }),
    extractedContent: z.string().optional(),
  }),
  execute: async ({ context, mastra }) => {
    return await auditContractFile(
      context.fileBuffer,
      context.fileName,
      context.contractType,
      context.contractId || `contract-${Date.now()}`,
      context.companyName,
      context.mimeType,
      context.includeExtractedContent,
      mastra
    );
  },
});

const auditContractFile = async (
  fileBuffer: ArrayBuffer | Buffer,
  fileName: string,
  contractType: ContractType,
  contractId: string,
  companyName?: string,
  mimeType?: string,
  includeExtractedContent: boolean = false,
  mastra?: any
): Promise<FileAuditResult> => {
  
  try {
    // 1. 验证文件类型
    if (!validateFileType(fileName, mimeType)) {
      throw new Error(`不支持的文件类型。在Cloudflare Workers环境下支持的格式: PDF, TXT`);
    }

    // 2. 解析文件内容
    const fileParseResult = await fileParserTool.execute({
      context: {
        fileBuffer,
        fileName,
        mimeType,
      }
    });

    if (!fileParseResult.success) {
      throw new Error(`文件解析失败: ${fileParseResult.error}`);
    }

    // 3. 执行合规审核
    const auditResult = await performDirectAudit(
      fileParseResult.content,
      contractType,
      contractId,
      companyName
    );

    return {
      ...auditResult,
      fileMetadata: fileParseResult.metadata,
      extractedContent: includeExtractedContent ? fileParseResult.content : undefined,
    };

  } catch (error) {
    console.error('合同文件审核错误:', error);
    
    // 获取文件大小
    const fileSize = fileBuffer instanceof ArrayBuffer 
      ? fileBuffer.byteLength 
      : fileBuffer.length;
    
    // 返回错误结果
    return {
      contractId,
      contractType,
      overallRiskLevel: RiskLevel.CRITICAL,
      complianceScore: 0,
      complianceChecks: [{
        category: '文件处理',
        requirement: '文件解析',
        status: 'fail',
        description: '文件解析或审核过程中发生错误',
        recommendation: '请检查文件格式和内容是否正确'
      }],
      summary: `文件审核失败: ${error instanceof Error ? error.message : '未知错误'}`,
      criticalIssues: ['文件处理: 文件解析失败'],
      recommendations: [
        '请检查文件格式是否正确（支持PDF、TXT）',
        '确保文件未损坏且包含文本内容',
        '如果是DOCX文件，请转换为PDF或TXT格式'
      ],
      auditTimestamp: new Date().toISOString(),
      fileMetadata: {
        fileName,
        fileType: mimeType || 'unknown',
        fileSize,
        wordCount: 0,
        extractedAt: new Date().toISOString(),
      },
      extractedContent: includeExtractedContent ? '' : undefined,
    };
  }
};

// 直接审核函数
const performDirectAudit = async (
  contractContent: string,
  contractType: ContractType,
  contractId: string,
  companyName?: string
): Promise<Omit<FileAuditResult, 'fileMetadata' | 'extractedContent'>> => {
  
  // 执行合规检查
  const complianceChecks = performComplianceChecks(contractContent, contractType);
  
  // 计算合规分数
  const complianceScore = calculateComplianceScore(complianceChecks);
  
  // 确定风险等级
  const overallRiskLevel = determineRiskLevel(complianceChecks, complianceScore);
  
  // 识别关键问题
  const criticalIssues = identifyCriticalIssues(complianceChecks);
  
  // 生成建议
  const recommendations = generateRecommendations(complianceChecks, contractType);
  
  // 生成摘要
  const summary = generateSummary(complianceScore, overallRiskLevel, contractType);

  return {
    contractId,
    contractType,
    overallRiskLevel,
    complianceScore,
    complianceChecks,
    summary,
    criticalIssues,
    recommendations,
    auditTimestamp: new Date().toISOString(),
  };
};

const performComplianceChecks = (contractContent: string, contractType: ContractType): ComplianceCheckItem[] => {
  const checks: ComplianceCheckItem[] = [];
  const content = contractContent.toLowerCase();

  // 基础合规检查项目
  const baseChecks = [
    {
      category: '数据安全',
      requirement: '数据保护条款',
      test: () => content.includes('数据保护') || content.includes('data protection') || content.includes('隐私'),
      description: '合同应包含明确的数据保护和隐私条款',
      failRecommendation: '添加数据保护条款，明确数据处理、存储和传输的安全要求'
    },
    {
      category: '知识产权',
      requirement: '知识产权归属',
      test: () => content.includes('知识产权') || content.includes('intellectual property') || content.includes('版权'),
      description: '合同应明确知识产权归属和使用权限',
      failRecommendation: '明确可视化大屏的知识产权归属，包括数据、设计和代码的所有权'
    },
    {
      category: '服务等级',
      requirement: 'SLA条款',
      test: () => content.includes('sla') || content.includes('服务等级') || content.includes('可用性') || content.includes('uptime'),
      description: '合同应包含服务等级协议和可用性保证',
      failRecommendation: '添加明确的SLA条款，包括系统可用性、响应时间和故障恢复时间要求'
    },
    {
      category: '责任限制',
      requirement: '责任限制条款',
      test: () => content.includes('责任限制') || content.includes('liability') || content.includes('赔偿'),
      description: '合同应包含合理的责任限制和赔偿条款',
      failRecommendation: '添加责任限制条款，明确各方在不同情况下的责任范围和赔偿限额'
    }
  ];

  // 可视化大屏特定检查
  const visualizationChecks = [
    {
      category: '数据可视化',
      requirement: '数据来源声明',
      test: () => content.includes('数据来源') || content.includes('data source') || content.includes('数据授权'),
      description: '应明确数据来源的合法性和授权使用范围',
      failRecommendation: '明确数据来源、获取方式和使用授权，确保数据使用的合法合规性'
    },
    {
      category: '技术规范',
      requirement: '技术标准要求',
      test: () => content.includes('技术标准') || content.includes('technical standard') || content.includes('接口规范'),
      description: '应包含技术实现标准和接口规范要求',
      failRecommendation: '添加技术标准要求，包括接口规范、数据格式、显示标准等技术细节'
    },
    {
      category: '用户体验',
      requirement: '用户体验标准',
      test: () => content.includes('用户体验') || content.includes('user experience') || content.includes('界面设计'),
      description: '应包含用户体验和界面设计的标准要求',
      failRecommendation: '明确用户体验标准，包括界面设计规范、交互要求和可访问性标准'
    }
  ];

  // 执行所有检查
  const allChecks = contractType === ContractType.VISUALIZATION_DASHBOARD 
    ? [...baseChecks, ...visualizationChecks] 
    : baseChecks;

  allChecks.forEach(check => {
    const passed = check.test();
    checks.push({
      category: check.category,
      requirement: check.requirement,
      status: passed ? 'pass' : 'fail',
      description: check.description,
      recommendation: passed ? undefined : check.failRecommendation
    });
  });

  // 添加特殊条款检查
  if (content.includes('排他性') || content.includes('exclusive')) {
    checks.push({
      category: '合同条款',
      requirement: '排他性条款审查',
      status: 'warning',
      description: '发现排他性条款，需要仔细评估对业务的影响',
      recommendation: '评估排他性条款的商业影响，确保不会限制未来业务发展'
    });
  }

  return checks;
};

const calculateComplianceScore = (checks: ComplianceCheckItem[]): number => {
  if (checks.length === 0) return 0;
  
  const passCount = checks.filter(check => check.status === 'pass').length;
  const warningCount = checks.filter(check => check.status === 'warning').length;
  
  // 通过项目得满分，警告项目得半分，失败项目不得分
  const score = (passCount + warningCount * 0.5) / checks.length * 100;
  return Math.round(score);
};

const determineRiskLevel = (checks: ComplianceCheckItem[], score: number): RiskLevel => {
  const failCount = checks.filter(check => check.status === 'fail').length;
  const criticalCategories = ['数据安全', '知识产权'];
  const criticalFails = checks.filter(check => 
    check.status === 'fail' && criticalCategories.includes(check.category)
  ).length;

  if (criticalFails > 0 || score < 50) {
    return RiskLevel.CRITICAL;
  } else if (failCount > 2 || score < 70) {
    return RiskLevel.HIGH;
  } else if (failCount > 0 || score < 85) {
    return RiskLevel.MEDIUM;
  } else {
    return RiskLevel.LOW;
  }
};

const identifyCriticalIssues = (checks: ComplianceCheckItem[]): string[] => {
  return checks
    .filter(check => check.status === 'fail')
    .filter(check => ['数据安全', '知识产权', '责任限制'].includes(check.category))
    .map(check => `${check.category}: ${check.requirement}`);
};

const generateRecommendations = (checks: ComplianceCheckItem[], contractType: ContractType): string[] => {
  const recommendations: string[] = [];
  
  const failedChecks = checks.filter(check => check.status === 'fail');
  failedChecks.forEach(check => {
    if (check.recommendation) {
      recommendations.push(check.recommendation);
    }
  });

  // 基于合同类型的特定建议
  if (contractType === ContractType.VISUALIZATION_DASHBOARD) {
    recommendations.push('建议添加数据刷新频率和实时性要求的具体条款');
    recommendations.push('明确可视化效果的验收标准和测试方法');
  }

  return recommendations;
};

const generateSummary = (score: number, riskLevel: RiskLevel, contractType: ContractType): string => {
  const typeMap = {
    [ContractType.VISUALIZATION_DASHBOARD]: '可视化大屏',
    [ContractType.SOFTWARE_LICENSE]: '软件许可',
    [ContractType.SERVICE_AGREEMENT]: '服务协议',
    [ContractType.MAINTENANCE]: '维护服务',
    [ContractType.DATA_PROCESSING]: '数据处理'
  };

  const riskMap = {
    [RiskLevel.LOW]: '低风险',
    [RiskLevel.MEDIUM]: '中等风险',
    [RiskLevel.HIGH]: '高风险',
    [RiskLevel.CRITICAL]: '严重风险'
  };

  return `${typeMap[contractType]}合同文件合规审核完成。合规得分：${score}分，风险等级：${riskMap[riskLevel]}。${
    score >= 85 ? '合同整体合规性良好。' : 
    score >= 70 ? '合同存在一些合规问题，建议优化。' : 
    '合同存在重要合规风险，需要重点关注和改进。'
  }`;
};