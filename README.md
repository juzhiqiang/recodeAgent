# 企业合同审核代理系统

基于Mastra框架构建的智能合同审核系统，专门用于审核可视化大屏企业合同的合规性。

## 🚀 功能特点

### 智能合同审核
- **自动合规检查**：全面检查数据安全、知识产权、SLA等关键条款
- **风险等级评估**：四级风险分类（低、中、高、严重）
- **合规性评分**：0-100分量化评估体系
- **专业建议生成**：针对性改进建议和操作指南

### 📄 文件处理能力
- **PDF文件支持**：智能解析PDF合同文档
- **TXT文件支持**：处理纯文本合同文件
- **DOCX基础支持**：有限的DOCX文件解析（推荐转换为PDF）
- **文件上传API**：支持Web界面直接上传文件审核

### 专业审核领域
- 🔒 **数据安全与隐私保护**：GDPR、个人信息保护法合规
- 📋 **知识产权保护**：IP归属和使用权限审核
- ⚡ **服务等级协议**：性能指标和可用性保证
- ⚖️ **责任限制与赔偿**：风险分担机制评估
- 🛠️ **技术规范要求**：接口标准和数据格式验证
- 🎨 **用户体验标准**：界面设计和可访问性规范

### 保留功能
- 🌤️ **天气查询代理**：保留原有天气查询功能

## 📦 项目结构

```
src/
├── mastra/
│   ├── agents/
│   │   ├── weather-agent.ts          # 天气查询代理（保留）
│   │   └── contract-audit-agent.ts   # 合同审核代理（新增）
│   ├── tools/
│   │   ├── weather-tool.ts           # 天气查询工具（保留）
│   │   ├── contract-audit-tool.ts    # 合同审核工具（新增）
│   │   ├── file-parser-tool.ts       # 文件解析工具（新增）
│   │   └── contract-file-audit-tool.ts # 文件合同审核工具（新增）
│   ├── workflows/
│   │   ├── weather-workflow.ts       # 天气工作流（保留）
│   │   └── contract-audit-workflow.ts # 合同审核工作流（新增）
│   └── index.ts                      # 主配置文件
docs/
├── contract-audit-workflow-guide.md  # 工作流使用指南
└── file-upload-api-guide.md         # 文件上传API指南
```

## 🛠️ 快速开始

### 环境要求
- Node.js >= 20.9.0
- npm 或 yarn

### 安装依赖
```bash
npm install
```

### 环境配置
创建 `.env` 文件并配置必要的环境变量：

```bash
# AI模型配置
DEEPSEEK_API_KEY=your_deepseek_api_key

# Cloudflare部署配置（可选）
CLOUDFLARE_API_TOKEN=your_cloudflare_token
CLOUDFLARE_ACCOUNT_ID=your_account_id
```

### 开发运行
```bash
# 开发模式
npm run dev

# 构建项目
npm run build

# 启动服务
npm run start
```

### 部署到Cloudflare
```bash
npm run deploy
```

## 💻 使用示例

### 📄 文件上传审核（推荐）

```typescript
import { mastra } from './src/mastra';

// 处理PDF/TXT文件上传审核
const handleFileUpload = async (file: File) => {
  const fileBuffer = await file.arrayBuffer();
  
  const result = await mastra.runTool('contractFileAuditTool', {
    fileBuffer,
    fileName: file.name,
    contractType: 'visualization_dashboard',
    contractId: 'VD-2024-001',
    mimeType: file.type,
  });
  
  return result;
};
```

### 📝 文本内容审核

```typescript
import { contractAuditAgent } from './src/mastra/agents/contract-audit-agent';

// 审核文本合同内容
const result = await contractAuditAgent.run({
  input: "请审核这份可视化大屏合同",
  context: {
    contractContent: `
      数据可视化服务合同
      
      甲方：XX科技有限公司
      乙方：YY信息技术有限公司
      
      服务内容：企业数据可视化大屏开发
      技术要求：实时数据更新、响应式设计
      数据处理：严格保护数据安全...
    `,
    contractType: "visualization_dashboard",
    contractId: "VD-2024-001"
  }
});
```

### 🔄 工作流审核

```typescript
// 使用完整工作流进行合同审核
const workflowResult = await mastra.runWorkflow('contract-audit-workflow', {
  contractContent: '合同内容...',
  contractType: 'visualization_dashboard',
  contractId: 'VD-2024-001'
});
```

### 🌤️ 天气查询（保留功能）

```typescript
import { weatherAgent } from './src/mastra/agents/weather-agent';

// 天气查询
const result = await weatherAgent.run({
  input: "北京今天的天气怎么样？"
});
```

## 📋 支持的文件格式

| 格式 | 支持程度 | 说明 |
|------|----------|------|
| PDF | ✅ 完全支持 | 通过自定义解析器提取文本内容 |
| TXT | ✅ 完全支持 | 直接读取文本内容 |
| DOCX | ⚠️ 有限支持 | 基础XML解析，建议转换为PDF |
| DOC | ❌ 不支持 | 请转换为DOCX或PDF格式 |

**文件限制**：
- 最大文件大小：10MB
- 支持中英文内容
- 自动检测文件类型

## 📊 审核报告示例

### 文件审核结果

```json
{
  "contractId": "VD-2024-001",
  "contractType": "visualization_dashboard",
  "overallRiskLevel": "medium",
  "complianceScore": 75,
  "summary": "可视化大屏合同文件合规审核完成。合规得分：75分，风险等级：中等风险",
  "criticalIssues": [
    "知识产权: 知识产权归属未明确"
  ],
  "recommendations": [
    "明确可视化大屏的知识产权归属",
    "添加数据保护条款",
    "完善SLA服务等级协议"
  ],
  "fileMetadata": {
    "fileName": "contract.pdf",
    "fileType": "application/pdf",
    "fileSize": 245760,
    "pageCount": 5,
    "wordCount": 1248
  }
}
```

## 🔧 核心组件

### 文件处理工具
- **`file-parser-tool.ts`**: 解析PDF、TXT、DOCX文件
- **`contract-file-audit-tool.ts`**: 集成文件解析和合规审核

### 合同审核工具
- **`contract-audit-tool.ts`**: 核心合规检查逻辑
- **`contract-audit-agent.ts`**: 智能对话审核助手

### 工作流系统
- **`contract-audit-workflow.ts`**: 完整的三步审核流程
  1. 预处理合同内容
  2. 执行合规审核
  3. 生成详细报告

### 天气功能（保留）
- **`weather-agent.ts`**: 天气查询代理
- **`weather-tool.ts`**: 天气查询工具
- **`weather-workflow.ts`**: 天气工作流

## 🎯 合规检查项目

### 基础检查
- ✅ 数据保护条款
- ✅ 知识产权归属
- ✅ 服务等级协议
- ✅ 责任限制条款

### 可视化大屏专项检查
- ✅ 数据来源合法性
- ✅ 技术标准要求
- ✅ 用户体验标准

## 📈 风险等级标准

| 等级 | 评分 | 描述 |
|------|------|------|
| 🟢 低风险 | 85-100 | 合规性良好，风险可控 |
| 🟡 中等风险 | 70-84 | 存在合规问题，建议优化 |
| 🟠 高风险 | 50-69 | 明显合规缺陷，需重点关注 |
| 🔴 严重风险 | 0-49 | 重大合规风险，必须处理 |

## 🌐 API集成

### 文件上传端点

```bash
POST /api/audit-contract-file
Content-Type: multipart/form-data

# 参数:
# - contract: 文件 (PDF/TXT/DOCX)
# - contractType: 合同类型
# - contractId: 合同编号（可选）
```

### 响应格式

```typescript
interface ApiResponse {
  success: boolean;
  data?: AuditResult;
  error?: string;
}
```

详细的API使用指南请参考 [文件上传API指南](./docs/file-upload-api-guide.md)。

## 🔄 版本更新

### v2.0.1 - 文件处理优化
- 🔧 修复Cloudflare Workers部署兼容性问题
- 📄 优化PDF/TXT文件解析性能
- 🛡️ 增强文件安全验证

### v2.0.0 - 文件上传功能
- ✨ 新增文件上传和解析功能
- 📄 支持PDF、TXT、DOCX文件格式
- 🌐 提供完整的文件上传API
- 🎯 针对Cloudflare Workers环境优化

### v1.0.0 - 合同审核功能
- ✨ 新增合同审核代理和工具
- 🔒 专业的可视化大屏合同合规性检查
- 📊 智能风险评估和合规评分
- 💡 自动生成改进建议
- 🔄 完整的工作流系统
- 🌤️ 保持天气查询功能兼容性

## 🚨 部署注意事项

### Cloudflare Workers兼容性
- 文件处理库设为可选依赖，避免部署冲突
- 使用Web API兼容的文件解析方法
- 优化内存使用，支持大文件处理

### 环境配置
```bash
# 必需环境变量
DEEPSEEK_API_KEY=your_api_key

# 可选（用于部署）
CLOUDFLARE_API_TOKEN=your_token
CLOUDFLARE_ACCOUNT_ID=your_account_id
```

## 🤝 贡献指南

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 📝 许可证

本项目采用 ISC 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 🆘 技术支持

- 📧 邮箱支持：Jzq1020814597@gmail.com
- 🐛 问题反馈：[GitHub Issues](https://github.com/juzhiqiang/recodeAgent/issues)
- 📖 详细文档：
  - [合同审核工作流指南](./docs/contract-audit-workflow-guide.md)
  - [文件上传API指南](./docs/file-upload-api-guide.md)

## 🔮 未来规划

- [ ] 支持更多文件格式（Excel、Word等）
- [ ] 增加OCR图像文字识别
- [ ] 集成更多法律数据库
- [ ] 支持批量合同审核
- [ ] 添加可视化报告功能
- [ ] Web界面开发
- [ ] 多语言支持
- [ ] API密钥管理
- [ ] 审核历史记录

## 📊 使用统计

- 支持合同类型：5种
- 合规检查项目：7个基础 + 3个专项
- 文件格式支持：PDF、TXT、DOCX
- 最大文件大小：10MB
- 部署环境：Cloudflare Workers兼容

---

**注意**：AI审核结果仅供参考，重要合同建议咨询专业律师进行最终确认。本系统已针对Cloudflare Workers环境优化，确保稳定的云端部署和快速响应。