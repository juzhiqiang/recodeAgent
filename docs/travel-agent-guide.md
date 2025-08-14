# 旅游路线推荐 Agent

## 功能概述

新增的旅游路线推荐Agent能够根据用户提供的一个或多个目的地，自动生成个性化的旅游线路规划。该Agent包含以下功能：

### 🎯 核心功能

1. **智能路线规划** - 根据地理位置优化旅行路线
2. **个性化推荐** - 支持不同旅行风格（经济、舒适、奢华）
3. **详细行程安排** - 提供逐日行程和景点推荐
4. **预算估算** - 根据旅行风格估算费用
5. **实用建议** - 提供旅行贴士和注意事项

## 使用方法

### 基础使用

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
```

### 使用工作流

```typescript
// 使用旅游工作流获得更详细的规划
const workflow = mastra.getWorkflow('travelRouteWorkflow');

const result = await workflow.execute({
  destinations: ['巴黎', '伦敦', '罗马'],
  travelStyle: 'comfort',
  duration: 7,
  startLocation: '北京'
});

console.log(result.itinerary);
console.log(result.routeSummary);
```

### 直接使用工具

```typescript
import { travelRouteTool } from './src/mastra/tools/travel-route-tool';

const routePlan = await travelRouteTool.execute({
  context: {
    destinations: ['Tokyo', 'Kyoto', 'Osaka'],
    travelStyle: 'luxury',
    duration: 5
  }
});
```

## 参数说明

### 输入参数

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `destinations` | string[] | ✅ | 目的地列表 |
| `travelStyle` | 'budget' \| 'comfort' \| 'luxury' | ❌ | 旅行风格，默认为 'comfort' |
| `duration` | number | ❌ | 总旅行天数，默认为 7 天 |
| `startLocation` | string | ❌ | 出发地点 |

### 输出结果

```typescript
{
  route: [
    {
      name: string,           // 目的地名称
      latitude: number,       // 纬度
      longitude: number,      // 经度
      country: string,        // 国家
      region?: string,        // 地区
      order: number,          // 路线顺序
      recommendedDays: number,// 建议停留天数
      attractions: string[],  // 主要景点
      transportation: string, // 交通方式
      estimatedCost: string,  // 预估费用
      description: string     // 目的地描述
    }
  ],
  totalDistance: number,      // 总距离（公里）
  totalDuration: number,      // 总行程天数
  estimatedBudget: string,    // 预估总预算
  bestTravelTime: string,     // 最佳旅行时间
  tips: string[]             // 旅行贴士
}
```

## 使用示例

### 示例 1：经济型欧洲三国游

```typescript
const europeTrip = await travelAgent.generate([
  {
    role: 'user',
    content: '我想用经济的方式游览巴黎、阿姆斯特丹、布鲁塞尔，预算有限，时间10天'
  }
]);
```

### 示例 2：奢华亚洲之旅

```typescript
const asiaLuxuryTrip = await travelRouteTool.execute({
  context: {
    destinations: ['东京', '京都', '大阪', '首尔'],
    travelStyle: 'luxury',
    duration: 12,
    startLocation: '上海'
  }
});
```

### 示例 3：美国西海岸自驾

```typescript
const usWestCoast = await workflow.execute({
  destinations: ['洛杉矶', '旧金山', '西雅图'],
  travelStyle: 'comfort',
  duration: 14
});
```

## 支持的目的地

Agent支持全球主要旅游城市，包括但不限于：

- **欧洲**：巴黎、伦敦、罗马、巴塞罗那、阿姆斯特丹、布鲁塞尔
- **亚洲**：东京、京都、大阪、首尔、新加坡、曼谷
- **北美**：纽约、洛杉矶、旧金山、芝加哥、多伦多
- **中国**：北京、上海、广州、西安、成都、杭州

## 旅行风格说明

### 🎒 经济型 (Budget)
- 优先选择公共交通和经济航班
- 推荐青年旅社和经济型住宿
- 包含当地美食街和市场推荐
- 预算范围：¥200-300/天

### 🏨 舒适型 (Comfort) 
- 选择高铁和商务航班
- 推荐中档酒店和民宿
- 平衡性价比和舒适度
- 预算范围：¥500-800/天

### 💎 奢华型 (Luxury)
- 头等舱和私人交通
- 五星级酒店和度假村
- 米其林餐厅和私人导游
- 预算范围：¥1200-2600/天

## 环境要求

确保您的环境变量中配置了 `DEEPSEEK_API_KEY`：

```bash
DEEPSEEK_API_KEY=your_deepseek_api_key_here
```

## 注意事项

1. **签证要求**：Agent会提醒检查签证要求，但具体办理需用户自行处理
2. **实时价格**：预算估算仅供参考，实际价格可能因季节和预订时间而变化
3. **天气因素**：建议结合天气Agent获取目的地天气信息
4. **文化差异**：Agent会提供基本的文化贴士，但建议提前了解当地习俗

## 集成其他Agent

旅游Agent可以与其他Agent协同工作：

```typescript
// 结合天气Agent获取目的地天气
const weatherAgent = mastra.getAgent('weatherAgent');
const weather = await weatherAgent.generate([
  { role: 'user', content: '巴黎现在的天气如何？' }
]);

// 然后使用旅游Agent规划行程
const travelPlan = await travelAgent.generate([
  { role: 'user', content: '考虑到巴黎的天气情况，帮我规划3天的行程' }
]);
```

## 技术架构

- **Agent**: `src/mastra/agents/travel-route-agent.ts`
- **Tool**: `src/mastra/tools/travel-route-tool.ts`
- **Workflow**: `src/mastra/workflows/travel-route-workflow.ts`
- **数据源**: Open-Meteo Geocoding API
- **AI模型**: DeepSeek Chat

通过这个旅游路线推荐Agent，用户只需要提供想去的地方，系统就能自动生成详细的旅游规划，大大简化了旅行计划的制定过程。
