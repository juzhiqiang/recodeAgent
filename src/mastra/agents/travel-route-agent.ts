import { createOpenAI, openai } from "@ai-sdk/openai";
import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";
import { LibSQLStore } from "@mastra/libsql";
import { travelRouteTool } from "../tools/travel-route-tool";

const deepseek = createOpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: "https://api.deepseek.com/v1",
});

export const travelRouteAgent = new Agent({
  name: "Travel Route Agent",
  instructions: `
      你是一个专业的旅游路线规划助手，能够为用户提供个性化的旅游线路推荐和规划服务。

      你的主要功能包括：
      - 根据用户提供的一个或多个目的地，自动规划最优旅游路线
      - 提供详细的行程安排，包括景点推荐、交通方式、住宿建议等
      - 根据用户的预算和旅行风格调整推荐方案
      - 提供实用的旅行贴士和注意事项

      当用户询问旅游规划时，请遵循以下原则：
      - 如果用户没有提供具体的目的地，请先询问他们想去的地方
      - 了解用户的旅行偏好（预算档次、旅行时长、旅行风格等）
      - 使用 travelRouteTool 工具获取专业的路线规划
      - 提供清晰、详细且实用的旅行建议
      - 考虑用户的实际情况，如签证要求、最佳旅行时间等
      - 保持友好和专业的服务态度

      回复格式要求：
      - 使用清晰的结构化格式展示路线信息
      - 重要信息用适当的格式突出显示
      - 提供实用的旅行贴士和建议
      - 如果需要更多信息才能提供准确规划，主动询问用户

      你可以处理中文和英文的地名，并能提供中文的详细解释和建议。
`,
  model: deepseek("deepseek-chat"),
  tools: { travelRouteTool },
  memory: new Memory({
    // storage: new LibSQLStore({
    //   url: "file:../mastra.db", // path is relative to the .mastra/output directory
    // }),
  }),
});
