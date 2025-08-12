import { Mastra } from "@mastra/core/mastra";
import { PinoLogger } from "@mastra/loggers";
import { LibSQLStore } from "@mastra/libsql";
import { CloudflareDeployer } from "@mastra/deployer-cloudflare";

// 导入工作流
import { weatherWorkflow } from "./workflows/weather-workflow";
import { contractAuditWorkflow } from "./workflows/contract-audit-workflow";

// 导入代理
import { weatherAgent } from "./agents/weather-agent";
import { contractAuditAgent } from "./agents/contract-audit-agent";

// 导入工具
import { weatherTool } from "./tools/weather-tool";
import { contractAuditTool } from "./tools/contract-audit-tool";
import { fileParserTool } from "./tools/file-parser-tool";
import { contractFileAuditTool } from "./tools/contract-file-audit-tool";

export const mastra = new Mastra({
  workflows: { 
    weatherWorkflow,
    contractAuditWorkflow,
  },
  agents: {
    weatherAgent,
    contractAuditAgent,
  },
  tools: {
    weatherTool,
    contractAuditTool,
    fileParserTool,
    contractFileAuditTool,
  },
  // storage: new LibSQLStore({
  //   // stores telemetry, evals, ... into memory storage, if it needs to persist, change to file:../mastra.db
  //   url: ":memory:",
  // }),
  logger: new PinoLogger({
    name: "Mastra",
    level: "info",
  }),
  deployer: new CloudflareDeployer({
    projectName: "hello-mastra",
    env: {
      CLOUDFLARE_ACCOUNT_ID: "6af174ce99a1e60d7c84c893850d7adb",
      CLOUDFLARE_API_TOKEN: process.env.CLOUDFLARE_API_TOKEN!,
      CLOUDFLARE_API_EMAIL: "Jzq1020814597@gmail.com",
    },
  }),
});