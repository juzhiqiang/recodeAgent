# 企业智能代理系统

基于Mastra框架构建的多功能智能代理系统，包含合同审核、旅游规划、天气查询等多个专业代理。

## 🚀 功能特点

### 📄 智能合同审核
- **自动合规检查**：全面检查数据安全、知识产权、SLA等关键条款
- **风险等级评估**：四级风险分类（低、中、高、严重）
- **合规性评分**：0-100分量化评估体系
- **专业建议生成**：针对性改进建议和操作指南

### 🗺️ 旅游线路推荐 (新增)
- **智能路线规划**：根据地理位置优化旅行路线
- **个性化推荐**：支持不同旅行风格（经济、舒适、奢华）
- **详细行程安排**：提供逐日行程和景点推荐
- **预算估算**：根据旅行风格估算费用
- **实用建议**：提供旅行贴士和注意事项

### 🌤️ 天气查询
- **实时天气信息**：获取全球城市天气数据
- **活动建议**：基于天气条件推荐适合的活动
- **多日预报**：提供详细的天气预报信息

## 📦 项目结构

```
src/
├── mastra/
│   ├── agents/
│   │   ├── weather-agent.ts          # 天气查询代理
│   │   ├── contract-audit-agent.ts   # 合同审核代理
│   │   └── travel-route-agent.ts     # 旅游路线代理（新增）
│   ├── tools/
│   │   ├── weather-tool.ts           # 天气查询工具
│   │   ├── contract-audit-tool.ts    # 合同审核工具
│   │   ├── file-parser-tool.ts       # 文件解析工具
│   │   ├── contract-file-audit-tool.ts # 文件合同审核工具
│   │   └── travel-route-tool.ts      # 旅游规划工具（新增）
│   ├── workflows/
│   │   ├── weather-workflow.ts       # 天气工作流
│   │   ├── contract-audit-workflow.ts # 合同审核工作流
│   │   └── travel-route-workflow.ts  # 旅游规划工作流（新增）
│   └── index.ts                      # 主配置文件
docs/
├── contract-audit-workflow-guide.md  # 合同审核工作流指南
├── file-upload-api-guide.md         # 文件上传API指南
└── travel-agent-guide.md            # 旅游代理使用指南（新增）
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

### 🗺️ 旅游线路规划（新功能）

```typescript
import { mastra } from './src/mastra';

// 获取旅游路线代理
const travelAgent = mastra.getAgent('travelRouteAgent');

// 基础路线规划
const response = await travelAgent.generate([
  {
    role: 'user',
    content: '我想去巴黎、伦敦、罗马旅游，请帮我规划一条7天的路线'
  }
]);

// 使用旅游工作流获得更详细的规划
const workflow = mastra.getWorkflow('travelRouteWorkflow');

const result = await workflow.execute({
  destinations: ['巴黎', '伦敦', '罗马'],
  travelStyle: 'comfort',
  duration: 7,
  startLocation: '北京'
});
```

### 📄 文件上传审核

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

### 🌤️ 天气查询

```typescript
import { weatherAgent } from './src/mastra/agents/weather-agent';

// 天气查询
const result = await weatherAgent.run({
  input: "北京今天的天气怎么样？"
});
```

## 🗺️ 旅游代理功能详情

### 支持的旅行风格

#### 🎒 经济型 (Budget)
- 优先选择公共交通和经济航班
- 推荐青年旅社和经济型住宿
- 包含当地美食街和市场推荐
- 预算范围：¥200-300/天

#### 🏨 舒适型 (Comfort) 
- 选择高铁和商务航班
- 推荐中档酒店和民宿
- 平衡性价比和舒适度
- 预算范围：¥500-800/天

#### 💎 奢华型 (Luxury)
- 头等舱和私人交通
- 五星级酒店和度假村
- 米其林餐厅和私人导游
- 预算范围：¥1200-2600/天

### 支持的目的地

Agent支持全球主要旅游城市，包括但不限于：

- **欧洲**：巴黎、伦敦、罗马、巴塞罗那、阿姆斯特丹、布鲁塞尔
- **亚洲**：东京、京都、大阪、首尔、新加坡、曼谷
- **北美**：纽约、洛杉矶、旧金山、芝加哥、多伦多
- **中国**：北京、上海、广州、西安、成都、杭州

详细的旅游代理使用指南请参考 [旅游代理指南](./docs/travel-agent-guide.md)。

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

## 📊 示例输出

### 旅游路线规划结果

```json
{
  "route": [
    {
      "name": "Paris",
      "order": 1,
      "recommendedDays": 3,
      "attractions": ["埃菲尔铁塔", "卢浮宫", "圣母院"],
      "transportation": "商务航班",
      "estimatedCost": "¥500-750/天",
      "description": "浪漫之都巴黎，拥有世界级的艺术博物馆"
    }
  ],
  "totalDistance": 2845,
  "totalDuration": 7,
  "estimatedBudget": "¥8,500 - ¥11,050",
  "bestTravelTime": "春季和秋季是大多数目的地的最佳旅行时间",
  "tips": [
    "提前预订住宿和交通，可以获得更好的价格",
    "建议购买旅行保险，确保旅途安全"
  ]
}
```

### 合同审核结果

```json
{
  "contractId": "VD-2024-001",
  "contractType": "visualization_dashboard",
  "overallRiskLevel": "medium",
  "complianceScore": 75,
  "summary": "可视化大屏合同文件合规审核完成。合规得分：75分",
  "criticalIssues": [
    "知识产权: 知识产权归属未明确"
  ],
  "recommendations": [
    "明确可视化大屏的知识产权归属",
    "添加数据保护条款"
  ]
}
```

## 🔧 核心组件

### 旅游组件（新增）
- **`travel-route-tool.ts`**: 路线规划和地理信息处理
- **`travel-route-agent.ts`**: 智能旅游规划助手
- **`travel-route-workflow.ts`**: 完整的旅游规划流程

### 文件处理工具
- **`file-parser-tool.ts`**: 解析PDF、TXT、DOCX文件
- **`contract-file-audit-tool.ts`**: 集成文件解析和合规审核

### 合同审核工具
- **`contract-audit-tool.ts`**: 核心合规检查逻辑
- **`contract-audit-agent.ts`**: 智能对话审核助手

### 天气功能
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

### 旅游规划端点

```bash
POST /api/plan-travel-route
Content-Type: application/json

{
  "destinations": ["巴黎", "伦敦", "罗马"],
  "travelStyle": "comfort",
  "duration": 7,
  "startLocation": "北京"
}
```

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
  data?: any;
  error?: string;
}
```

## 🔄 版本更新

### v2.1.0 - 旅游规划功能
- ✨ 新增旅游路线推荐代理
- 🗺️ 智能路线优化算法
- 💰 个性化预算估算
- 🎯 详细景点推荐
- 📝 完整的行程规划工作流

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
  - [旅游代理使用指南](./docs/travel-agent-guide.md)

## 🔮 未来规划

### 旅游功能扩展
- [ ] 实时航班和酒店价格查询
- [ ] 景点评分和用户评价集成
- [ ] 多语言旅游指南
- [ ] AR导航和景点介绍

### 合同审核增强
- [ ] 支持更多文件格式（Excel、Word等）
- [ ] 增加OCR图像文字识别
- [ ] 集成更多法律数据库
- [ ] 支持批量合同审核

### 系统优化
- [ ] Web界面开发
- [ ] 移动端APP
- [ ] API密钥管理
- [ ] 审核历史记录
- [ ] 用户权限管理

## 📊 使用统计

- **支持代理数量**：3个（合同审核、旅游规划、天气查询）
- **支持合同类型**：5种
- **合规检查项目**：7个基础 + 3个专项
- **文件格式支持**：PDF、TXT、DOCX
- **支持目的地**：全球主要城市
- **旅行风格**：3种（经济、舒适、奢华）
- **最大文件大小**：10MB
- **部署环境**：Cloudflare Workers兼容

---

**注意**：
- AI审核结果仅供参考，重要合同建议咨询专业律师进行最终确认
- 旅游规划建议仅供参考，实际行程请根据个人需求和实时情况调整
- 本系统已针对Cloudflare Workers环境优化，确保稳定的云端部署和快速响应
