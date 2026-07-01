# SeenSpace Python Backend Migration Plan

本文档用于规划 SeenSpace 从“前端 IndexedDB 主存储 + Node AI 代理”迁移到“Python FastAPI 后端统一承载项目数据与 AI 分析”的开发路径。

当前状态：Phase 1 到 Phase 4 的第一版已经完成。仓库已新增 FastAPI 后端、项目 API、AI 分析 API，前端项目服务已切换到 `/api/projects`。数据库目标已调整为 MySQL。后续重点是补 Alembic/MySQL 迁移、清理旧 Node AI 代理和 Dexie 主存储职责。

## 1. 改造目标

当前项目的主要数据仍存储在浏览器 IndexedDB 中，AI 分析通过 `server/ai-server.mjs` 代理到 OpenAI-compatible Chat Completions 接口。新的目标是引入真实 Python 后端，让后端成为项目数据和 AI 分析的统一服务入口。

本轮迁移目标：

- 用 Python 后端接管项目列表、项目详情、项目创建、画布保存。
- 用 Python 后端接管 AI 分析接口。
- 前端不再把 IndexedDB 作为主事实源。
- 继续沿用当前 `ProjectRecord`、`WorkspaceSnapshot`、`AnalysisResult` 作为前后端契约基线。
- 迁移期间保留前端本地启发式 AI 回退能力，降低后端不可用时的体验风险。

## 2. 推荐技术栈

- Web 框架：FastAPI
- 数据模型：Pydantic v2
- ORM：SQLAlchemy 2.x
- 迁移工具：Alembic
- 数据库：MySQL 8
- 测试备选：SQLite
- HTTP 客户端：httpx
- 开发服务器：uvicorn
- 测试：pytest + httpx AsyncClient

MySQL 8 作为最终目标数据库，适合常规 Web 应用部署、用户系统、云同步和版本历史。测试环境可以继续使用 SQLite，避免每次运行测试都依赖本地 MySQL 服务。

## 3. 目标架构

```mermaid
flowchart TD
  Frontend["React + Vite Frontend"] --> ProjectApi["FastAPI /api/projects"]
  Frontend --> AiApi["FastAPI /api/ai/analyze"]

  ProjectApi --> ProjectService["Project Service"]
  ProjectService --> Database["MySQL"]

  AiApi --> AiService["AI Service"]
  AiService --> LLM["OpenAI-compatible LLM API"]

  Frontend -.fallback.-> LocalHeuristic["Local heuristic analysis"]
```

迁移完成后：

- `src/features/project/services/project-service.ts` 从 Dexie 改为 HTTP API client。
- `src/features/ai/services/analysis-service.ts` 继续请求 `/api/ai/analyze`，但该接口由 Python 后端提供。
- `server/ai-server.mjs` 进入废弃状态，确认前端完全切走后删除。
- `src/db/client.ts` 和 Dexie 可以先保留为离线缓存候选，最终再决定移除或弱化。

## 4. 后端目录结构

建议新增 `backend/` 目录：

```text
backend/
  app/
    api/
      routes/
        ai.py
        health.py
        projects.py
      router.py
    core/
      config.py
      database.py
      errors.py
    models/
      project.py
    schemas/
      ai.py
      project.py
      workspace.py
    services/
      ai_service.py
      project_service.py
      seed_service.py
    main.py
  alembic/
    versions/
  tests/
    test_ai.py
    test_health.py
    test_projects.py
  alembic.ini
  pyproject.toml
  README.md
```

职责划分：

- `api/routes/`：HTTP 路由层，只处理请求/响应。
- `schemas/`：Pydantic 模型，对齐前端 TypeScript 类型。
- `models/`：SQLAlchemy 数据库模型。
- `services/`：项目、种子数据、AI 分析等业务逻辑。
- `core/`：配置、数据库连接、错误处理等基础设施。

## 5. API 设计

### Health

```http
GET /api/health
```

响应：

```json
{
  "status": "ok"
}
```

### List Projects

```http
GET /api/projects
```

响应：`ProjectRecord[]`，按 `updatedAt` 倒序。

### Get Project

```http
GET /api/projects/{project_id}
```

成功响应：`ProjectRecord`

不存在：

```json
{
  "detail": "Project not found."
}
```

### Create Project

```http
POST /api/projects
```

第一阶段可以不需要请求体，由后端创建默认项目。

响应：`ProjectRecord`

默认值需对齐当前前端：

- `name`: `未命名项目`
- `summary`: `用于链接、图片、笔记和 AI 洞察的新画布。`
- `initials`: `新`
- `thumbnailVariant`: `mist`
- `canvas`: 空 `WorkspaceSnapshot`

### Update Project Canvas

```http
PATCH /api/projects/{project_id}/canvas
```

请求体：

```json
{
  "canvas": {
    "nodes": [],
    "edges": [],
    "viewport": {
      "x": 0,
      "y": 0,
      "zoom": 1
    }
  }
}
```

响应：`ProjectRecord`

后端需要同步更新：

- `canvas`
- `updatedAt`
- `nodeCount`

### Analyze AI

```http
POST /api/ai/analyze
```

请求体沿用当前前端 `buildAnalysisRequestPayload(...)` 输出结构。

响应：

```json
{
  "title": "画布整体洞察",
  "summary": "分析摘要",
  "keywords": ["关键词一", "关键词二"],
  "scope": "canvas",
  "sourceNodeIds": ["node-id"],
  "question": "可选追问"
}
```

后端需要保证响应结构兼容当前前端 `AnalysisResult`。

## 6. 数据库设计

第一阶段使用单表 JSON 方案，优先保证迁移速度和契约稳定。

### projects

```sql
create table projects (
  id text primary key,
  name text not null,
  summary text not null,
  created_at datetime not null,
  updated_at datetime not null,
  node_count integer not null default 0,
  initials text not null,
  thumbnail_variant text not null,
  canvas_json json not null
) character set utf8mb4 collate utf8mb4_unicode_ci;

create index idx_projects_updated_at on projects (updated_at desc);
```

字段映射：

```text
ProjectRecord.id                 -> projects.id
ProjectRecord.name               -> projects.name
ProjectRecord.summary            -> projects.summary
ProjectRecord.createdAt          -> projects.created_at
ProjectRecord.updatedAt          -> projects.updated_at
ProjectRecord.nodeCount          -> projects.node_count
ProjectRecord.initials           -> projects.initials
ProjectRecord.thumbnailVariant   -> projects.thumbnail_variant
ProjectRecord.canvas             -> projects.canvas_json
```

`canvas_json` 暂时直接保存 `WorkspaceSnapshot`。后续如果需要全文检索、节点级权限、协作或版本历史，再拆出 `nodes`、`edges`、`project_versions` 等表。

## 7. Pydantic 契约

建议 Pydantic 响应字段继续使用前端 camelCase：

```python
class ProjectRecord(BaseModel):
    id: str
    name: str
    summary: str
    updatedAt: str
    createdAt: str
    nodeCount: int
    initials: str
    thumbnailVariant: Literal["sand", "steel", "mist", "mint"]
    canvas: WorkspaceSnapshot
```

原因：

- 避免前端迁移时新增大量字段映射。
- 保持 `project-service.ts` 改造简单。
- 数据库存 snake_case，API 输出 camelCase，是后端内部转换问题。

`WorkspaceSnapshot` 第一阶段可以用宽松模型：

```python
class WorkspaceSnapshot(BaseModel):
    nodes: list[dict[str, Any]]
    edges: list[dict[str, Any]]
    viewport: dict[str, Any]
```

等后端需要理解节点语义时，再逐步收紧为完整类型。

## 8. 环境变量

建议后端使用 `.env` 或 `.env.local`：

```text
APP_ENV=development
API_HOST=127.0.0.1
API_PORT=8787
DATABASE_URL=mysql+pymysql://seenspace:seenspace@127.0.0.1:3306/seenspace?charset=utf8mb4
CORS_ORIGINS=http://localhost:7788
LLM_API_KEY=
LLM_BASE_URL=https://api.openai.com/v1
LLM_MODEL=gpt-4o-mini
LLM_TIMEOUT_SECONDS=45
```

开发期可以让 Python 后端沿用 `8787` 端口，这样前端当前 `/api/ai/analyze` 的代理习惯不需要改变太多。

## 9. 前端改造计划

### Step 1: 新增 API Client

新增：

```text
src/lib/api-client.ts
```

建议封装：

- `apiGet<T>(path)`
- `apiPost<T>(path, body?)`
- `apiPatch<T>(path, body)`

第一阶段可以使用相对路径 `/api/...`，由 Vite proxy 转发到 Python 后端。

### Step 2: 改造 Project Service

目标文件：

```text
src/features/project/services/project-service.ts
```

替换：

- `ensureProjectSeed()`：改为 no-op 或请求后端 seed endpoint。
- `listProjects()`：改为 `GET /api/projects`。
- `getProjectById(id)`：改为 `GET /api/projects/{id}`。
- `createProject()`：改为 `POST /api/projects`。
- `updateProjectCanvas(id, canvas)`：改为 `PATCH /api/projects/{id}/canvas`。

Dexie 暂时不要立刻删除，避免一次改动过大。

### Step 3: 改造 AI Service

目标文件：

```text
src/features/ai/services/analysis-service.ts
```

保持请求：

```text
POST /api/ai/analyze
```

前端本地 fallback 可以保留，后端出错时仍能返回一个可插入画布的洞察。

### Step 4: Vite Proxy

修改：

```text
vite.config.ts
```

新增开发代理：

```ts
server: {
  proxy: {
    '/api': 'http://127.0.0.1:8787',
  },
}
```

注意保留当前 `host`、`port`、`strictPort` 设置。

### Step 5: README 更新

README 需要改为：

- 前端：`pnpm dev`
- 后端：进入 `backend/` 启动 `uvicorn app.main:app --reload --port 8787`
- AI 配置由 Python 后端读取
- Node `pnpm dev:ai` 标记为旧方案或移除

## 10. 后端开发阶段

### Phase 1: FastAPI 骨架

- 创建 `backend/`
- 配置 `pyproject.toml`
- 创建 `app/main.py`
- 创建 `/api/health`
- 配置 CORS
- 配置环境变量读取

验收：

- `GET /api/health` 返回 `{ "status": "ok" }`
- 后端可用 `uvicorn` 启动

### Phase 2: 数据库与项目 API

- 接入 SQLAlchemy
- 创建 `Project` 模型
- 配置 Alembic
- 创建 `projects` 表迁移
- 实现项目 CRUD
- 实现 seed service

验收：

- `GET /api/projects` 返回项目列表
- `POST /api/projects` 创建项目
- `PATCH /api/projects/{id}/canvas` 能保存画布

### Phase 3: AI 分析 API

- 迁移 Node AI 代理 prompt 到 Python
- 使用 httpx 调用 OpenAI-compatible Chat Completions
- 校验 JSON 响应
- 返回 `AnalysisResult`

验收：

- `/api/ai/analyze` 在配置 `LLM_API_KEY` 后能返回模型洞察
- 未配置或请求失败时返回明确错误
- 前端 fallback 能接住失败

### Phase 4: 前端切换

- 添加 Vite proxy
- 改造 `project-service.ts`
- 保留前端本地 AI fallback
- 更新测试 mock

验收：

- 项目列表从 Python 后端加载
- 新建项目写入 Python 数据库
- 工作区编辑后保存到 Python 数据库
- 刷新页面后画布数据仍存在
- AI 分析请求走 Python 后端

### Phase 5: 清理旧实现

- 移除或标记废弃 `server/ai-server.mjs`
- 移除 `dev:ai` 脚本或改名为 legacy
- 评估 Dexie 是否保留为离线缓存
- 更新 `CODE_WIKI.md`

验收：

- README 与 Code Wiki 不再把 IndexedDB 描述为主存储
- 没有前端代码依赖 Dexie 完成核心路径

## 11. 测试计划

后端测试：

- `GET /api/health`
- `GET /api/projects`
- `GET /api/projects/{id}`
- `POST /api/projects`
- `PATCH /api/projects/{id}/canvas`
- `/api/ai/analyze` 成功路径
- `/api/ai/analyze` 模型失败路径

前端测试：

- `project-service.ts` API client mock
- `ProjectListPage` 加载和新建项目
- `WorkspacePage` 加载、保存、AI 插入
- 现有 workspace service tests 保持通过

集成验证：

- 启动 Python 后端
- 启动 Vite 前端
- 新建项目
- 添加节点
- 刷新页面
- 再次进入项目确认画布仍存在
- 执行 AI 分析并插入洞察节点

## 12. 风险与处理

### 大 JSON 保存冲突

当前画布保存是整份 `WorkspaceSnapshot` 覆盖写入。多人协作或多端同时编辑时会产生覆盖风险。

第一阶段处理：

- 单用户模式下接受覆盖写。
- 后端返回 `updatedAt`。
- 后续加入 `version` 或 `revision` 字段做乐观锁。

### Canvas JSON 体积增长

图片节点可能保存 data URL，导致 `canvas_json` 很大。

第一阶段处理：

- 保持兼容当前数据。
- 后续新增文件上传接口，把图片存对象存储或本地文件服务，节点里只保存 URL。

### API 字段命名

前端使用 camelCase，数据库使用 snake_case。

处理：

- API 层保持 camelCase。
- ORM 层使用 snake_case。
- 在 service/schema 层做转换。

### AI 输出结构不稳定

模型可能返回非 JSON 或字段缺失。

处理：

- 后端严格解析 JSON。
- 后端清洗 `title`、`summary`、`keywords`。
- 前端继续保留本地 fallback。

## 13. 开发顺序建议

建议按下面顺序开工：

1. 新建 FastAPI 骨架和 `/api/health`。
2. 建立 `projects` 表和 seed 数据。
3. 实现项目 CRUD API。
4. 给 Vite 加 `/api` proxy。
5. 改造前端 `project-service.ts`。
6. 迁移 AI 分析到 Python。
7. 更新 README 与 Code Wiki。
8. 清理 Node AI 代理和 Dexie 主存储职责。

这个顺序能让每一步都有可验证结果，也方便回滚。

## 14. 第一阶段完成定义

第一阶段完成后，应满足：

- Python 后端可以独立启动。
- 项目数据保存在真实数据库中。
- 前端项目列表、新建项目、打开工作区、保存画布全部走 Python API。
- AI 分析请求由 Python 后端处理。
- IndexedDB 不再是主事实源。
- 现有前端测试通过。
- 新增后端接口测试通过。
