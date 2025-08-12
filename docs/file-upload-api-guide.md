# 文件上传合同审核API使用指南

## 概述

本指南展示如何使用API接口上传合同文件（PDF、TXT）进行合规性审核。由于Cloudflare Workers环境的限制，目前支持PDF和TXT格式的文件。

## 🔧 支持的文件格式

### ✅ 完全支持
- **PDF文件** (.pdf) - 通过自定义解析器提取文本
- **TXT文件** (.txt) - 直接读取文本内容

### ⚠️ 有限支持
- **DOCX文件** (.docx) - 基础解析，建议转换为PDF格式

### ❌ 暂不支持
- **DOC文件** (.doc) - 请转换为DOCX或PDF格式
- **图像文件** - 需要OCR处理，暂不支持

## 📤 API接口使用

### 基础文件审核

```typescript
import { mastra } from './src/mastra';

// 处理文件上传的API端点示例
export async function handleFileUpload(request: Request): Promise<Response> {
  try {
    // 1. 解析multipart/form-data
    const formData = await request.formData();
    const file = formData.get('contract') as File;
    const contractType = formData.get('contractType') as string;
    const contractId = formData.get('contractId') as string;
    
    if (!file) {
      return new Response(JSON.stringify({
        success: false,
        error: '请选择要上传的合同文件'
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 2. 验证文件大小和类型
    if (file.size > 10 * 1024 * 1024) { // 10MB
      return new Response(JSON.stringify({
        success: false,
        error: '文件大小不能超过10MB'
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 3. 读取文件内容
    const fileBuffer = await file.arrayBuffer();
    
    // 4. 调用合同文件审核工具
    const auditResult = await mastra.runTool('contractFileAuditTool', {
      fileBuffer,
      fileName: file.name,
      contractType: contractType || 'visualization_dashboard',
      contractId: contractId || `contract-${Date.now()}`,
      mimeType: file.type,
      includeExtractedContent: false, // 生产环境建议设为false
    });

    // 5. 返回审核结果
    return new Response(JSON.stringify({
      success: true,
      data: auditResult
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('文件上传处理错误:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : '文件处理失败'
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
```

### 批量文件审核

```typescript
export async function handleBatchFileUpload(request: Request): Promise<Response> {
  try {
    const formData = await request.formData();
    const files = formData.getAll('contracts') as File[];
    const contractType = formData.get('contractType') as string;
    
    if (files.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        error: '请选择要上传的合同文件'
      }), { status: 400 });
    }

    // 限制批量处理数量
    if (files.length > 5) {
      return new Response(JSON.stringify({
        success: false,
        error: '批量处理最多支持5个文件'
      }), { status: 400 });
    }

    const results = [];
    
    for (const file of files) {
      try {
        const fileBuffer = await file.arrayBuffer();
        
        const auditResult = await mastra.runTool('contractFileAuditTool', {
          fileBuffer,
          fileName: file.name,
          contractType: contractType || 'visualization_dashboard',
          contractId: `batch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          mimeType: file.type,
        });

        results.push({
          fileName: file.name,
          success: true,
          result: auditResult
        });
      } catch (error) {
        results.push({
          fileName: file.name,
          success: false,
          error: error instanceof Error ? error.message : '处理失败'
        });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      data: results
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: '批量处理失败'
    }), { status: 500 });
  }
}
```

## 🌐 前端集成示例

### HTML表单

```html
<!DOCTYPE html>
<html>
<head>
    <title>合同审核上传</title>
    <style>
        .upload-container {
            max-width: 600px;
            margin: 50px auto;
            padding: 20px;
            border: 1px solid #ddd;
            border-radius: 8px;
        }
        .form-group {
            margin-bottom: 15px;
        }
        label {
            display: block;
            margin-bottom: 5px;
            font-weight: bold;
        }
        input, select {
            width: 100%;
            padding: 8px;
            border: 1px solid #ccc;
            border-radius: 4px;
        }
        .upload-btn {
            background: #007cba;
            color: white;
            padding: 10px 20px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
        }
        .result {
            margin-top: 20px;
            padding: 15px;
            border-radius: 4px;
        }
        .success { background: #d4edda; border: 1px solid #c3e6cb; }
        .error { background: #f8d7da; border: 1px solid #f5c6cb; }
    </style>
</head>
<body>
    <div class="upload-container">
        <h2>合同合规审核</h2>
        <form id="uploadForm">
            <div class="form-group">
                <label for="contract">选择合同文件</label>
                <input type="file" id="contract" name="contract" 
                       accept=".pdf,.txt,.docx" required>
                <small>支持格式：PDF, TXT, DOCX（最大10MB）</small>
            </div>
            
            <div class="form-group">
                <label for="contractType">合同类型</label>
                <select id="contractType" name="contractType">
                    <option value="visualization_dashboard">可视化大屏</option>
                    <option value="software_license">软件许可</option>
                    <option value="service_agreement">服务协议</option>
                    <option value="maintenance">维护服务</option>
                    <option value="data_processing">数据处理</option>
                </select>
            </div>
            
            <div class="form-group">
                <label for="contractId">合同编号（可选）</label>
                <input type="text" id="contractId" name="contractId" 
                       placeholder="例如：VD-2024-001">
            </div>
            
            <button type="submit" class="upload-btn">开始审核</button>
        </form>
        
        <div id="result"></div>
    </div>

    <script>
        document.getElementById('uploadForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData(e.target);
            const resultDiv = document.getElementById('result');
            
            // 显示加载状态
            resultDiv.innerHTML = '<div>正在审核合同，请稍候...</div>';
            
            try {
                const response = await fetch('/api/audit-contract-file', {
                    method: 'POST',
                    body: formData
                });
                
                const result = await response.json();
                
                if (result.success) {
                    displayResult(result.data);
                } else {
                    resultDiv.innerHTML = `<div class="result error">审核失败: ${result.error}</div>`;
                }
            } catch (error) {
                resultDiv.innerHTML = `<div class="result error">网络错误: ${error.message}</div>`;
            }
        });
        
        function displayResult(data) {
            const resultDiv = document.getElementById('result');
            const riskColor = {
                'low': '#28a745',
                'medium': '#ffc107', 
                'high': '#fd7e14',
                'critical': '#dc3545'
            };
            
            resultDiv.innerHTML = `
                <div class="result success">
                    <h3>审核完成</h3>
                    <p><strong>合同ID:</strong> ${data.contractId}</p>
                    <p><strong>合规评分:</strong> ${data.complianceScore}/100</p>
                    <p><strong>风险等级:</strong> 
                        <span style="color: ${riskColor[data.overallRiskLevel]}">
                            ${data.overallRiskLevel.toUpperCase()}
                        </span>
                    </p>
                    <p><strong>审核摘要:</strong> ${data.summary}</p>
                    
                    ${data.criticalIssues.length > 0 ? `
                        <h4>关键问题:</h4>
                        <ul>
                            ${data.criticalIssues.map(issue => `<li>${issue}</li>`).join('')}
                        </ul>
                    ` : ''}
                    
                    ${data.recommendations.length > 0 ? `
                        <h4>改进建议:</h4>
                        <ul>
                            ${data.recommendations.map(rec => `<li>${rec}</li>`).join('')}
                        </ul>
                    ` : ''}
                    
                    <h4>文件信息:</h4>
                    <p><strong>文件名:</strong> ${data.fileMetadata.fileName}</p>
                    <p><strong>文件大小:</strong> ${(data.fileMetadata.fileSize / 1024).toFixed(2)} KB</p>
                    <p><strong>字数统计:</strong> ${data.fileMetadata.wordCount} 字/词</p>
                    ${data.fileMetadata.pageCount ? `<p><strong>页数:</strong> ${data.fileMetadata.pageCount} 页</p>` : ''}
                </div>
            `;
        }
    </script>
</body>
</html>
```

### React组件示例

```tsx
import React, { useState } from 'react';

interface AuditResult {
  contractId: string;
  complianceScore: number;
  overallRiskLevel: string;
  summary: string;
  criticalIssues: string[];
  recommendations: string[];
  fileMetadata: {
    fileName: string;
    fileSize: number;
    wordCount: number;
    pageCount?: number;
  };
}

const ContractUpload: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [contractType, setContractType] = useState('visualization_dashboard');
  const [contractId, setContractId] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AuditResult | null>(null);
  const [error, setError] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file) {
      setError('请选择要上传的文件');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('contract', file);
      formData.append('contractType', contractType);
      if (contractId) {
        formData.append('contractId', contractId);
      }

      const response = await fetch('/api/audit-contract-file', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setResult(data.data);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('上传失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (level: string) => {
    const colors = {
      low: '#28a745',
      medium: '#ffc107',
      high: '#fd7e14',
      critical: '#dc3545'
    };
    return colors[level as keyof typeof colors] || '#6c757d';
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">合同合规审核</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            选择合同文件
          </label>
          <input
            type="file"
            accept=".pdf,.txt,.docx"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="w-full border border-gray-300 rounded-md p-2"
            required
          />
          <p className="text-sm text-gray-500 mt-1">
            支持格式：PDF, TXT, DOCX（最大10MB）
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            合同类型
          </label>
          <select
            value={contractType}
            onChange={(e) => setContractType(e.target.value)}
            className="w-full border border-gray-300 rounded-md p-2"
          >
            <option value="visualization_dashboard">可视化大屏</option>
            <option value="software_license">软件许可</option>
            <option value="service_agreement">服务协议</option>
            <option value="maintenance">维护服务</option>
            <option value="data_processing">数据处理</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            合同编号（可选）
          </label>
          <input
            type="text"
            value={contractId}
            onChange={(e) => setContractId(e.target.value)}
            placeholder="例如：VD-2024-001"
            className="w-full border border-gray-300 rounded-md p-2"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? '正在审核...' : '开始审核'}
        </button>
      </form>

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {result && (
        <div className="mt-6 p-6 bg-green-50 border border-green-200 rounded-md">
          <h3 className="text-lg font-semibold mb-4">审核完成</h3>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p><strong>合同ID:</strong> {result.contractId}</p>
              <p><strong>合规评分:</strong> {result.complianceScore}/100</p>
            </div>
            <div>
              <p><strong>风险等级:</strong> 
                <span style={{ color: getRiskColor(result.overallRiskLevel) }}>
                  {result.overallRiskLevel.toUpperCase()}
                </span>
              </p>
              <p><strong>字数:</strong> {result.fileMetadata.wordCount}</p>
            </div>
          </div>

          <div className="mb-4">
            <p><strong>审核摘要:</strong></p>
            <p className="text-gray-700">{result.summary}</p>
          </div>

          {result.criticalIssues.length > 0 && (
            <div className="mb-4">
              <h4 className="font-semibold text-red-600">关键问题:</h4>
              <ul className="list-disc list-inside text-red-600">
                {result.criticalIssues.map((issue, index) => (
                  <li key={index}>{issue}</li>
                ))}
              </ul>
            </div>
          )}

          {result.recommendations.length > 0 && (
            <div>
              <h4 className="font-semibold text-blue-600">改进建议:</h4>
              <ul className="list-disc list-inside text-blue-600">
                {result.recommendations.map((rec, index) => (
                  <li key={index}>{rec}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ContractUpload;
```

## 📋 API响应格式

### 成功响应

```json
{
  "success": true,
  "data": {
    "contractId": "VD-2024-001",
    "contractType": "visualization_dashboard",
    "overallRiskLevel": "medium",
    "complianceScore": 75,
    "complianceChecks": [
      {
        "category": "数据安全",
        "requirement": "数据保护条款",
        "status": "pass",
        "description": "合同应包含明确的数据保护和隐私条款"
      }
    ],
    "summary": "可视化大屏合同文件合规审核完成...",
    "criticalIssues": [
      "知识产权: 知识产权归属"
    ],
    "recommendations": [
      "明确可视化大屏的知识产权归属，包括数据、设计和代码的所有权"
    ],
    "auditTimestamp": "2024-01-15T10:30:00.000Z",
    "fileMetadata": {
      "fileName": "contract.pdf",
      "fileType": "application/pdf",
      "fileSize": 245760,
      "pageCount": 5,
      "wordCount": 1248,
      "extractedAt": "2024-01-15T10:30:00.000Z"
    }
  }
}
```

### 错误响应

```json
{
  "success": false,
  "error": "不支持的文件类型。在Cloudflare Workers环境下支持的格式: PDF, TXT"
}
```

## 🔒 安全考虑

1. **文件大小限制**: 最大10MB，防止资源滥用
2. **文件类型验证**: 只允许安全的文档格式
3. **内容安全**: 不在响应中包含完整文件内容（除非明确要求）
4. **速率限制**: 建议实施API调用频率限制
5. **日志记录**: 记录审核操作用于审计追踪

## 🚀 部署注意事项

1. **环境兼容性**: 代码已优化适配Cloudflare Workers环境
2. **依赖管理**: 文件处理库设为可选依赖，避免部署冲突
3. **性能优化**: 大文件处理采用流式处理，减少内存占用
4. **错误处理**: 完善的错误处理和用户友好的错误信息

## 📞 技术支持

如遇到问题，请检查：
1. 文件格式是否支持（PDF、TXT）
2. 文件大小是否超过限制（10MB）
3. 网络连接是否正常
4. API端点配置是否正确