import { createServer } from 'node:http'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

function loadEnvFile(fileName) {
  const filePath = resolve(process.cwd(), fileName)
  if (!existsSync(filePath)) return

  const lines = readFileSync(filePath, 'utf8').split(/\r?\n/)
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const separatorIndex = trimmed.indexOf('=')
    if (separatorIndex === -1) continue

    const key = trimmed.slice(0, separatorIndex).trim()
    const rawValue = trimmed.slice(separatorIndex + 1).trim()
    const value = rawValue.replace(/^['"]|['"]$/g, '')
    if (key && process.env[key] === undefined) {
      process.env[key] = value
    }
  }
}

loadEnvFile('.env')
loadEnvFile('.env.local')

const port = Number(process.env.AI_SERVER_PORT ?? 8787)
const apiKey = process.env.LLM_API_KEY
const baseUrl = (process.env.LLM_BASE_URL ?? 'https://api.openai.com/v1').replace(/\/$/, '')
const model = process.env.LLM_MODEL ?? 'gpt-4o-mini'

function sendJson(response, status, body) {
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': process.env.AI_CORS_ORIGIN ?? 'http://localhost:7788',
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'content-type',
  })
  response.end(JSON.stringify(body))
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    let body = ''
    request.setEncoding('utf8')
    request.on('data', (chunk) => {
      body += chunk
      if (body.length > 1_000_000) {
        reject(new Error('Request body is too large.'))
        request.destroy()
      }
    })
    request.on('end', () => {
      try {
        resolve(JSON.parse(body || '{}'))
      } catch {
        reject(new Error('Request body must be valid JSON.'))
      }
    })
    request.on('error', reject)
  })
}

function isPayload(value) {
  return (
    value &&
    (value.scope === 'canvas' || value.scope === 'selection') &&
    Array.isArray(value.sourceNodeIds) &&
    Array.isArray(value.nodes) &&
    Array.isArray(value.edges)
  )
}

function sanitizeAnalysisResult(value) {
  const title = typeof value?.title === 'string' ? value.title.trim().slice(0, 40) : ''
  const summary = typeof value?.summary === 'string' ? value.summary.trim().slice(0, 800) : ''
  const keywords = Array.isArray(value?.keywords)
    ? value.keywords
        .filter((keyword) => typeof keyword === 'string')
        .map((keyword) => keyword.trim())
        .filter(Boolean)
        .slice(0, 8)
    : []

  if (!title || !summary) {
    throw new Error('Model response did not include title and summary.')
  }

  return {
    title,
    summary,
    keywords,
  }
}

function buildMessages(payload) {
  return [
    {
      role: 'system',
      content:
        '你是 SeenSpace 的创意素材分析助手。你需要把画布中的笔记、网页、图片描述、标签和连接关系整理成可插入画布的洞察。只返回 JSON，不要返回 Markdown。',
    },
    {
      role: 'user',
      content: JSON.stringify({
        task: '分析素材并生成洞察卡片。title 不超过 16 个中文字，summary 用 120 到 220 个中文字，keywords 返回 3 到 6 个中文关键词。',
        outputSchema: {
          title: 'string',
          summary: 'string',
          keywords: ['string'],
        },
        payload,
      }),
    },
  ]
}

async function analyzeWithModel(payload) {
  if (!apiKey) {
    throw new Error('LLM_API_KEY is not configured.')
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: buildMessages(payload),
      temperature: 0.4,
      response_format: { type: 'json_object' },
    }),
  })

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(`Model request failed: ${response.status} ${detail.slice(0, 300)}`)
  }

  const data = await response.json()
  const content = data?.choices?.[0]?.message?.content
  if (typeof content !== 'string') {
    throw new Error('Model response did not include message content.')
  }

  return sanitizeAnalysisResult(JSON.parse(content))
}

const server = createServer(async (request, response) => {
  if (request.method === 'OPTIONS') {
    sendJson(response, 204, {})
    return
  }

  if (request.method !== 'POST' || request.url !== '/api/ai/analyze') {
    sendJson(response, 404, { error: 'Not found.' })
    return
  }

  try {
    const payload = await readJson(request)
    if (!isPayload(payload)) {
      sendJson(response, 400, { error: 'Invalid analysis payload.' })
      return
    }

    const modelResult = await analyzeWithModel(payload)
    sendJson(response, 200, {
      ...modelResult,
      scope: payload.scope,
      sourceNodeIds: payload.sourceNodeIds,
      question: typeof payload.question === 'string' && payload.question.trim() ? payload.question.trim() : undefined,
    })
  } catch (error) {
    sendJson(response, 500, { error: error instanceof Error ? error.message : 'AI analysis failed.' })
  }
})

server.listen(port, () => {
  console.log(`SeenSpace AI server listening on http://localhost:${port}`)
})
