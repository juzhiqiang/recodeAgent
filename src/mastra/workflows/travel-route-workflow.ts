import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';

const routePlanSchema = z.object({
  route: z.array(z.object({
    name: z.string(),
    latitude: z.number(),
    longitude: z.number(),
    country: z.string(),
    region: z.string().optional(),
    order: z.number(),
    recommendedDays: z.number(),
    attractions: z.array(z.string()),
    transportation: z.string(),
    estimatedCost: z.string(),
    description: z.string(),
  })),
  totalDistance: z.number(),
  totalDuration: z.number(),
  estimatedBudget: z.string(),
  bestTravelTime: z.string(),
  tips: z.array(z.string()),
});

const planTravelRoute = createStep({
  id: 'plan-travel-route',
  description: 'Plans travel route based on destinations and preferences',
  inputSchema: z.object({
    destinations: z.array(z.string()).describe('List of destination names'),
    travelStyle: z.enum(['budget', 'comfort', 'luxury']).optional().describe('Travel style preference'),
    duration: z.number().optional().describe('Total trip duration in days'),
    startLocation: z.string().optional().describe('Starting location'),
  }),
  outputSchema: routePlanSchema,
  execute: async ({ inputData, mastra }) => {
    if (!inputData) {
      throw new Error('Input data not found');
    }

    const agent = mastra?.getAgent('travelRouteAgent');
    if (!agent) {
      throw new Error('Travel route agent not found');
    }

    // 使用代理的工具进行路线规划
    const routePlan = await agent.generate(
      [
        {
          role: 'user',
          content: `请为我规划一个旅游路线，目的地包括：${inputData.destinations.join(', ')}。
                   旅行风格：${inputData.travelStyle || '舒适'}
                   总天数：${inputData.duration || 7}天
                   ${inputData.startLocation ? `出发地：${inputData.startLocation}` : ''}
                   
                   请提供详细的路线规划，包括景点推荐、交通方式、预算估算等信息。`,
        },
      ],
      {
        tools: {
          travelRouteTool: {
            destinations: inputData.destinations,
            travelStyle: inputData.travelStyle || 'comfort',
            duration: inputData.duration || 7,
            startLocation: inputData.startLocation,
          },
        },
      }
    );

    // 从工具调用结果中提取路线数据
    const toolResult = routePlan.toolResults?.[0];
    if (toolResult && toolResult.result) {
      return toolResult.result;
    }

    // 如果没有工具结果，返回基本结构
    throw new Error('Failed to generate travel route plan');
  },
});

const generateDetailedItinerary = createStep({
  id: 'generate-detailed-itinerary',
  description: 'Generates detailed day-by-day itinerary based on route plan',
  inputSchema: routePlanSchema,
  outputSchema: z.object({
    itinerary: z.string(),
    routeSummary: z.object({
      totalDestinations: z.number(),
      totalDistance: z.number(),
      totalDuration: z.number(),
      estimatedBudget: z.string(),
    }),
  }),
  execute: async ({ inputData, mastra }) => {
    const routePlan = inputData;

    if (!routePlan) {
      throw new Error('Route plan data not found');
    }

    const agent = mastra?.getAgent('travelRouteAgent');
    if (!agent) {
      throw new Error('Travel route agent not found');
    }

    const prompt = `基于以下路线规划，请生成详细的逐日行程安排：

路线信息：
${JSON.stringify(routePlan, null, 2)}

请按照以下格式提供详细的行程安排：

🗺️ 旅游路线总览
═══════════════════════════

📍 目的地：${routePlan.route.map(r => r.name).join(' → ')}
🕐 总行程：${routePlan.totalDuration}天
🚗 总距离：${routePlan.totalDistance}公里
💰 预算范围：${routePlan.estimatedBudget}
🌟 最佳旅行时间：${routePlan.bestTravelTime}

📅 详细行程安排
═══════════════════════════

${routePlan.route.map((destination, index) => `
📍 第${destination.order}站：${destination.name}
━━━━━━━━━━━━━━━━━━━━━━━

🏛️ 目的地信息
• 位置：${destination.country}${destination.region ? ', ' + destination.region : ''}
• 建议停留：${destination.recommendedDays}天
• 交通方式：${destination.transportation}
• 预估花费：${destination.estimatedCost}

🎯 必游景点
${destination.attractions.map(attraction => `• ${attraction}`).join('\n')}

📝 目的地介绍
${destination.description}

${destination.recommendedDays > 1 ? `
📅 推荐行程安排
${Array.from({length: destination.recommendedDays}, (_, dayIndex) => `
第${dayIndex + 1}天：
上午：${destination.attractions[dayIndex * 2] || destination.attractions[0]}
下午：${destination.attractions[dayIndex * 2 + 1] || destination.attractions[1] || destination.attractions[0]}
晚上：当地特色美食体验
`).join('')}
` : ''}

${index < routePlan.route.length - 1 ? `
🚗 前往下一站
• 目的地：${routePlan.route[index + 1].name}
• 交通方式：${routePlan.route[index + 1].transportation}
• 预计用时：根据实际交通工具安排
` : ''}
`).join('\n')}

💡 旅行贴士
═══════════════════════════
${routePlan.tips.map(tip => `• ${tip}`).join('\n')}

请确保行程安排合理，考虑交通时间和休息安排。`;

    const response = await agent.stream([
      {
        role: 'user',
        content: prompt,
      },
    ]);

    let itineraryText = '';

    for await (const chunk of response.textStream) {
      process.stdout.write(chunk);
      itineraryText += chunk;
    }

    return {
      itinerary: itineraryText,
      routeSummary: {
        totalDestinations: routePlan.route.length,
        totalDistance: routePlan.totalDistance,
        totalDuration: routePlan.totalDuration,
        estimatedBudget: routePlan.estimatedBudget,
      },
    };
  },
});

const travelRouteWorkflow = createWorkflow({
  id: 'travel-route-workflow',
  inputSchema: z.object({
    destinations: z.array(z.string()).describe('List of destination names'),
    travelStyle: z.enum(['budget', 'comfort', 'luxury']).optional().describe('Travel style preference'),
    duration: z.number().optional().describe('Total trip duration in days'),
    startLocation: z.string().optional().describe('Starting location'),
  }),
  outputSchema: z.object({
    itinerary: z.string(),
    routeSummary: z.object({
      totalDestinations: z.number(),
      totalDistance: z.number(),
      totalDuration: z.number(),
      estimatedBudget: z.string(),
    }),
  }),
})
  .then(planTravelRoute)
  .then(generateDetailedItinerary);

travelRouteWorkflow.commit();

export { travelRouteWorkflow };
