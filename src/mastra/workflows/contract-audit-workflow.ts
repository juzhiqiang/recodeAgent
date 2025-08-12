import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';

// 合同类型枚举
const ContractTypeSchema = z.enum([
  'visualization_dashboard',
  'software_license', 
  'service_agreement',
  'maintenance',
  'data_processing'
]);

// 风险等级枚举
const RiskLevelSchema = z.enum(['low', 'medium', 'high', 'critical']);

// 合规检查项目Schema
const ComplianceCheckSchema = z.object({
  category: z.string(),
  requirement: z.string(),
  status: z.enum(['pass', 'fail', 'warning']),
  description: z.string(),
  recommendation: z.string().optional(),
});

// 审核结果Schema
const AuditResultSchema = z.object({
  contractId: z.string(),
  contractType: ContractTypeSchema,
  overallRiskLevel: RiskLevelSchema,
  complianceScore: z.number(),
  complianceChecks: z.array(ComplianceCheckSchema),
  summary: z.string(),
  criticalIssues: z.array(z.string()),
  recommendations: z.array(z.string()),
  auditTimestamp: z.string(),
});

// 预处理合同内容
const preprocessContract = createStep({
  id: 'preprocess-contract',
  description: 'Preprocesses contract content and validates input',
  inputSchema: z.object({
    contractContent: z.string().describe('Raw contract content'),
    contractType: ContractTypeSchema.describe('Type of contract'),
    contractId: z.string().optional().describe('Contract identifier'),
    companyName: z.string().optional().describe('Company name'),
  }),
  outputSchema: z.object({
    processedContent: z.string(),
    contractType: ContractTypeSchema,
    contractId: z.string(),
    companyName: z.string().optional(),
    contentLength: z.number(),
    detectedLanguage: z.string(),
    hasStandardClauses: z.boolean(),
  }),
  execute: async ({ inputData }) => {
    if (!inputData) {
      throw new Error('Input data not found');
    }

    const { contractContent, contractType, contractId, companyName } = inputData;

    // 基本内容预处理
    const processedContent = contractContent.trim();
    
    if (processedContent.length < 100) {
      throw new Error('Contract content too short for meaningful analysis');
    }

    // 生成合同ID（如果没有提供）
    const finalContractId = contractId || `contract-${Date.now()}`;

    // 检测语言（简单检测）
    const chineseChars = /[\u4e00-\u9fff]/.test(processedContent);
    const detectedLanguage = chineseChars ? 'chinese' : 'english';

    // 检测标准条款
    const standardClauses = [
      '甲方', '乙方', 'party', 'agreement', 
      '合同', 'contract', '条款', 'clause'
    ];
    const hasStandardClauses = standardClauses.some(clause => 
      processedContent.toLowerCase().includes(clause.toLowerCase())
    );

    return {
      processedContent,
      contractType,
      contractId: finalContractId,
      companyName,
      contentLength: processedContent.length,
      detectedLanguage,
      hasStandardClauses,
    };
  },
});

// 执行合规审核
const performAudit = createStep({
  id: 'perform-audit',
  description: 'Performs comprehensive compliance audit using the contract audit tool',
  inputSchema: z.object({
    processedContent: z.string(),
    contractType: ContractTypeSchema,
    contractId: z.string(),
    companyName: z.string().optional(),
    contentLength: z.number(),
    detectedLanguage: z.string(),
    hasStandardClauses: z.boolean(),
  }),
  outputSchema: AuditResultSchema,
  execute: async ({ inputData, mastra }) => {
    if (!inputData) {
      throw new Error('Preprocessed data not found');
    }

    // 获取合同审核工具
    const auditTool = mastra?.getTool('contractAuditTool');
    if (!auditTool) {
      throw new Error('Contract audit tool not found');
    }

    // 执行审核
    const auditResult = await auditTool.execute({
      context: {
        contractContent: inputData.processedContent,
        contractType: inputData.contractType,
        contractId: inputData.contractId,
        companyName: inputData.companyName,
      }
    });

    return auditResult;
  },
});

// 生成详细报告
const generateReport = createStep({
  id: 'generate-report',
  description: 'Generates detailed audit report with recommendations',
  inputSchema: AuditResultSchema,
  outputSchema: z.object({
    auditResult: AuditResultSchema,
    detailedReport: z.string(),
    executiveSummary: z.string(),
    actionItems: z.array(z.object({
      priority: z.enum(['high', 'medium', 'low']),
      category: z.string(),
      action: z.string(),
      deadline: z.string().optional(),
    })),
  }),
  execute: async ({ inputData, mastra }) => {
    if (!inputData) {
      throw new Error('Audit result not found');
    }

    const agent = mastra?.getAgent('contractAuditAgent');
    if (!agent) {
      throw new Error('Contract audit agent not found');
    }

    // 生成详细报告
    const reportPrompt = `
      基于以下合同审核结果，生成一份专业的详细审核报告：

      审核结果：
      ${JSON.stringify(inputData, null, 2)}

      请按照以下格式生成报告：

      # 合同合规审核报告

      ## 📋 基本信息
      - 合同编号：${inputData.contractId}
      - 合同类型：${inputData.contractType}
      - 审核时间：${inputData.auditTimestamp}
      - 合规评分：${inputData.complianceScore}/100
      - 风险等级：${inputData.overallRiskLevel}

      ## 📊 审核概要
      ${inputData.summary}

      ## 🔍 详细检查结果
      
      ### ✅ 合规项目
      [列出所有通过的检查项目]

      ### ⚠️ 风险提醒
      [列出所有警告项目]

      ### ❌ 不合规项目
      [列出所有失败的检查项目，包括具体建议]

      ## 🚨 关键风险点
      ${inputData.criticalIssues.length > 0 ? inputData.criticalIssues.join('\n') : '无关键风险'}

      ## 💡 改进建议
      ${inputData.recommendations.join('\n')}

      ## 📈 合规性分析
      [提供深入的合规性分析和建议]

      ## 🎯 后续行动
      [提供具体的后续行动建议]

      请确保报告专业、详细且实用。
    `;

    const reportResponse = await agent.stream([
      {
        role: 'user',
        content: reportPrompt,
      },
    ]);

    let detailedReport = '';
    for await (const chunk of reportResponse.textStream) {
      detailedReport += chunk;
    }

    // 生成执行摘要
    const summaryPrompt = `
      基于审核结果，生成一份简洁的执行摘要（不超过200字）：
      
      合规评分：${inputData.complianceScore}/100
      风险等级：${inputData.overallRiskLevel}
      关键问题数量：${inputData.criticalIssues.length}
      
      请用简洁的语言总结主要发现和建议。
    `;

    const summaryResponse = await agent.stream([
      {
        role: 'user',
        content: summaryPrompt,
      },
    ]);

    let executiveSummary = '';
    for await (const chunk of summaryResponse.textStream) {
      executiveSummary += chunk;
    }

    // 生成行动项目
    const actionItems = generateActionItems(inputData);

    return {
      auditResult: inputData,
      detailedReport,
      executiveSummary,
      actionItems,
    };
  },
});

// 生成行动项目的辅助函数
function generateActionItems(auditResult: any) {
  const actionItems = [];

  // 基于关键问题生成高优先级行动项目
  auditResult.criticalIssues.forEach((issue: string) => {
    actionItems.push({
      priority: 'high' as const,
      category: issue.split(':')[0],
      action: `立即处理: ${issue}`,
      deadline: '7天内',
    });
  });

  // 基于失败的检查项目生成中优先级行动项目
  auditResult.complianceChecks
    .filter((check: any) => check.status === 'fail')
    .forEach((check: any) => {
      if (!auditResult.criticalIssues.some((issue: string) => issue.includes(check.category))) {
        actionItems.push({
          priority: 'medium' as const,
          category: check.category,
          action: check.recommendation || `完善${check.requirement}`,
          deadline: '30天内',
        });
      }
    });

  // 基于警告项目生成低优先级行动项目
  auditResult.complianceChecks
    .filter((check: any) => check.status === 'warning')
    .forEach((check: any) => {
      actionItems.push({
        priority: 'low' as const,
        category: check.category,
        action: check.recommendation || `优化${check.requirement}`,
        deadline: '90天内',
      });
    });

  return actionItems;
}

// 创建合同审核工作流
const contractAuditWorkflow = createWorkflow({
  id: 'contract-audit-workflow',
  inputSchema: z.object({
    contractContent: z.string().describe('Contract content to audit'),
    contractType: ContractTypeSchema.describe('Type of contract'),
    contractId: z.string().optional().describe('Contract identifier'),
    companyName: z.string().optional().describe('Company name'),
  }),
  outputSchema: z.object({
    auditResult: AuditResultSchema,
    detailedReport: z.string(),
    executiveSummary: z.string(),
    actionItems: z.array(z.object({
      priority: z.enum(['high', 'medium', 'low']),
      category: z.string(),
      action: z.string(),
      deadline: z.string().optional(),
    })),
  }),
})
  .then(preprocessContract)
  .then(performAudit)
  .then(generateReport);

contractAuditWorkflow.commit();

export { contractAuditWorkflow };