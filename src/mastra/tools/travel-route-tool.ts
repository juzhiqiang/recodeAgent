import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

interface GeocodingResponse {
  results: {
    latitude: number;
    longitude: number;
    name: string;
    country: string;
    admin1?: string;
    admin2?: string;
  }[];
}

interface RouteData {
  name: string;
  latitude: number;
  longitude: number;
  country: string;
  region?: string;
  attractions?: string[];
  travelTime?: number; // 建议游玩时间（小时）
  transportation?: string;
  description?: string;
}

export const travelRouteTool = createTool({
  id: 'plan-travel-route',
  description: 'Plan travel routes between multiple destinations with recommendations',
  inputSchema: z.object({
    destinations: z.array(z.string()).describe('List of destination names'),
    travelStyle: z.enum(['budget', 'comfort', 'luxury']).optional().describe('Travel style preference'),
    duration: z.number().optional().describe('Total trip duration in days'),
    startLocation: z.string().optional().describe('Starting location (if different from first destination)'),
  }),
  outputSchema: z.object({
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
  }),
  execute: async ({ context }) => {
    return await planTravelRoute(
      context.destinations,
      context.travelStyle || 'comfort',
      context.duration || 7,
      context.startLocation
    );
  },
});

const planTravelRoute = async (
  destinations: string[],
  travelStyle: 'budget' | 'comfort' | 'luxury',
  duration: number,
  startLocation?: string
): Promise<{
  route: RouteData[];
  totalDistance: number;
  totalDuration: number;
  estimatedBudget: string;
  bestTravelTime: string;
  tips: string[];
}> => {
  try {
    // 获取所有目的地的地理信息
    const locations: RouteData[] = [];
    
    for (const destination of destinations) {
      const geocodingUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(destination)}&count=1`;
      const response = await fetch(geocodingUrl);
      const data = (await response.json()) as GeocodingResponse;
      
      if (data.results?.[0]) {
        const location = data.results[0];
        locations.push({
          name: location.name,
          latitude: location.latitude,
          longitude: location.longitude,
          country: location.country,
          region: location.admin1,
          attractions: getAttractions(location.name),
          travelTime: getRecommendedDays(location.name),
          transportation: getTransportationMethod(travelStyle),
          description: getLocationDescription(location.name),
        });
      }
    }

    if (locations.length === 0) {
      throw new Error('No valid destinations found');
    }

    // 优化路线顺序（简单的最近邻算法）
    const optimizedRoute = optimizeRoute(locations);
    
    // 计算总距离
    const totalDistance = calculateTotalDistance(optimizedRoute);
    
    // 添加路线顺序和详细信息
    const detailedRoute = optimizedRoute.map((location, index) => ({
      ...location,
      order: index + 1,
      recommendedDays: Math.max(1, Math.floor(duration / locations.length)),
      attractions: location.attractions || [],
      transportation: getTransportationForSegment(
        index === 0 ? null : optimizedRoute[index - 1],
        location,
        travelStyle
      ),
      estimatedCost: getEstimatedCost(location.name, travelStyle),
      description: location.description || `Explore the beautiful ${location.name}`,
    }));

    // 生成旅行建议
    const tips = generateTravelTips(optimizedRoute, travelStyle, duration);
    
    return {
      route: detailedRoute,
      totalDistance: Math.round(totalDistance),
      totalDuration: duration,
      estimatedBudget: getOverallBudget(locations.length, duration, travelStyle),
      bestTravelTime: getBestTravelTime(optimizedRoute),
      tips,
    };
  } catch (error) {
    throw new Error(`Failed to plan travel route: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// 辅助函数
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // 地球半径（公里）
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function optimizeRoute(locations: RouteData[]): RouteData[] {
  if (locations.length <= 2) return locations;
  
  // 简单的最近邻算法
  const optimized = [locations[0]];
  const remaining = locations.slice(1);
  
  while (remaining.length > 0) {
    const current = optimized[optimized.length - 1];
    let nearest = 0;
    let minDistance = Infinity;
    
    remaining.forEach((location, index) => {
      const distance = calculateDistance(
        current.latitude, current.longitude,
        location.latitude, location.longitude
      );
      if (distance < minDistance) {
        minDistance = distance;
        nearest = index;
      }
    });
    
    optimized.push(remaining.splice(nearest, 1)[0]);
  }
  
  return optimized;
}

function calculateTotalDistance(locations: RouteData[]): number {
  let total = 0;
  for (let i = 1; i < locations.length; i++) {
    total += calculateDistance(
      locations[i - 1].latitude, locations[i - 1].longitude,
      locations[i].latitude, locations[i].longitude
    );
  }
  return total;
}

function getAttractions(locationName: string): string[] {
  const attractionsMap: Record<string, string[]> = {
    'Paris': ['埃菲尔铁塔', '卢浮宫', '圣母院', '香榭丽舍大街', '凯旋门'],
    'London': ['大本钟', '白金汉宫', '伦敦眼', '大英博物馆', '塔桥'],
    'Tokyo': ['浅草寺', '东京塔', '皇居', '新宿', '涩谷'],
    'New York': ['自由女神像', '中央公园', '时代广场', '帝国大厦', '布鲁克林大桥'],
    'Beijing': ['故宫', '天安门广场', '长城', '天坛', '颐和园'],
    'Shanghai': ['外滩', '东方明珠', '豫园', '南京路', '新天地'],
    'Rome': ['斗兽场', '梵蒂冈', '特雷维喷泉', '万神殿', '西班牙阶梯'],
    'Barcelona': ['圣家堂', '巴塞罗那哥特区', '公园桂尔', '巴特略之家', '兰布拉大道'],
  };
  
  // 查找匹配的景点，支持模糊匹配
  for (const [key, attractions] of Object.entries(attractionsMap)) {
    if (locationName.toLowerCase().includes(key.toLowerCase()) || 
        key.toLowerCase().includes(locationName.toLowerCase())) {
      return attractions;
    }
  }
  
  return [`${locationName}主要景点`, `${locationName}历史文化区`, `${locationName}自然风光`];
}

function getRecommendedDays(locationName: string): number {
  const daysMap: Record<string, number> = {
    'Paris': 3,
    'London': 3,
    'Tokyo': 4,
    'New York': 3,
    'Beijing': 3,
    'Shanghai': 2,
    'Rome': 3,
    'Barcelona': 2,
  };
  
  for (const [key, days] of Object.entries(daysMap)) {
    if (locationName.toLowerCase().includes(key.toLowerCase())) {
      return days;
    }
  }
  
  return 2; // 默认2天
}

function getTransportationMethod(travelStyle: string): string {
  const transportMap = {
    budget: '公共交通/经济航班',
    comfort: '高铁/商务航班',
    luxury: '头等舱/私人交通'
  };
  return transportMap[travelStyle as keyof typeof transportMap] || '公共交通';
}

function getTransportationForSegment(
  from: RouteData | null, 
  to: RouteData, 
  travelStyle: string
): string {
  if (!from) return '到达目的地';
  
  const distance = calculateDistance(from.latitude, from.longitude, to.latitude, to.longitude);
  
  if (distance < 300) {
    return travelStyle === 'luxury' ? '私人包车' : travelStyle === 'comfort' ? '高铁/快车' : '长途巴士';
  } else {
    return travelStyle === 'luxury' ? '头等舱航班' : travelStyle === 'comfort' ? '商务舱航班' : '经济舱航班';
  }
}

function getEstimatedCost(locationName: string, travelStyle: string): string {
  const baseCosts = {
    budget: { daily: 200, multiplier: 1 },
    comfort: { daily: 500, multiplier: 1.5 },
    luxury: { daily: 1200, multiplier: 2.5 }
  };
  
  const cost = baseCosts[travelStyle as keyof typeof baseCosts];
  return `¥${cost.daily}-${cost.daily * cost.multiplier}/天`;
}

function getOverallBudget(destinations: number, duration: number, travelStyle: string): string {
  const budgets = {
    budget: duration * 300,
    comfort: duration * 800,
    luxury: duration * 2000
  };
  
  const base = budgets[travelStyle as keyof typeof budgets];
  const total = base + (destinations * 1000); // 加上交通费用
  
  return `¥${total.toLocaleString()} - ¥${(total * 1.3).toLocaleString()}`;
}

function getBestTravelTime(locations: RouteData[]): string {
  // 根据目的地推荐最佳旅行时间
  const seasons = ['春季(3-5月)', '夏季(6-8月)', '秋季(9-11月)', '冬季(12-2月)'];
  return '春季和秋季是大多数目的地的最佳旅行时间，天气宜人，游客相对较少';
}

function generateTravelTips(locations: RouteData[], travelStyle: string, duration: number): string[] {
  const tips = [
    '提前预订住宿和交通，可以获得更好的价格',
    '建议购买旅行保险，确保旅途安全',
    '准备好各国的签证和护照，检查有效期',
    '下载离线地图和翻译APP，方便出行',
  ];
  
  if (travelStyle === 'budget') {
    tips.push('寻找当地美食街和市场，体验地道文化的同时节省费用');
    tips.push('选择青年旅社或民宿，既经济又能结识新朋友');
  } else if (travelStyle === 'luxury') {
    tips.push('预订米其林星级餐厅，享受顶级美食体验');
    tips.push('考虑私人导游服务，获得更深入的文化体验');
  }
  
  if (duration > 10) {
    tips.push('长途旅行建议适当安排休息日，避免过度疲劳');
  }
  
  if (locations.length > 3) {
    tips.push('多城市旅行建议轻装出行，可以在当地购买纪念品');
  }
  
  return tips;
}

function getLocationDescription(locationName: string): string {
  const descriptions: Record<string, string> = {
    'Paris': '浪漫之都巴黎，拥有世界级的艺术博物馆、优雅的建筑和美食文化',
    'London': '历史悠久的伦敦，融合了传统与现代，是文化和金融的重要中心',
    'Tokyo': '现代化的东京，传统日本文化与尖端科技的完美结合',
    'New York': '不夜城纽约，世界文化和商业的交汇点，充满无限可能',
    'Beijing': '中国首都北京，拥有丰富的历史文化遗产和现代都市风貌',
    'Shanghai': '国际化大都市上海，东西方文化交融的现代化城市',
    'Rome': '永恒之城罗马，拥有2000多年历史的古老文明',
    'Barcelona': '艺术之城巴塞罗那，高迪的建筑艺术和地中海风情的完美结合',
  };
  
  for (const [key, desc] of Object.entries(descriptions)) {
    if (locationName.toLowerCase().includes(key.toLowerCase())) {
      return desc;
    }
  }
  
  return `探索${locationName}的独特魅力和文化风情`;
}
