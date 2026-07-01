# SeenSpace / 见间

SeenSpace / 见间是一款以无限画布为核心、本地优先的灵感整理工作台。它面向设计师、内容创作者、产品经理和需要整理大量碎片素材的人，让网页、图片、便签、标签和 AI 洞察可以被放在同一张桌面上，通过空间摆放、连线、分组和分析逐步形成清晰的创意脉络。

## 功能概览

- 项目列表：支持项目初始化、本地项目读取、新建项目、搜索和网格/列表视图切换。
- 无限画布：基于 React Flow，支持节点拖拽、缩放、平移、连线和视口持久化。
- 多类型节点：支持笔记、网页、图片、标签 / Meta、AI 洞察节点。
- 剪贴板导入：粘贴文本、链接或图片时自动生成对应节点，也可以更新同类型选中节点。
- 节点与连线编辑：通过检查器编辑节点内容、批量处理节点元信息、管理连线标签。
- 分组能力：支持多节点分组、取消分组、重命名、折叠和展开。
- 快捷键：支持撤销/重做、复制、分组、取消分组、删除、方向键移动等工作区操作。
- AI 分析侧栏：可对整张画布或选中内容调用大模型生成洞察，并在服务不可用时自动降级为本地启发式结果。
- 本地优先存储：项目与画布快照保存在浏览器 IndexedDB 中。
- 主题切换：支持亮色/暗色主题。

## 技术栈

- Vite 8
- React 19
- TypeScript 6
- Tailwind CSS 4
- React Router 7
- React Flow (`@xyflow/react`)
- FastAPI / SQLAlchemy
- next-themes
- lucide-react
- Vitest + Testing Library

## 快速开始

推荐使用 pnpm。

```bash
pnpm install
pnpm dev
```

开发服务器默认运行在：

```text
http://localhost:7788
```

Vite 配置中启用了 `host: 0.0.0.0`、`port: 7788` 和 `strictPort: true`。如果端口被占用，需要先释放端口或修改 `vite.config.ts`。

### Python 后端

项目数据与 AI 分析接口由 FastAPI 后端提供。开发时新开一个终端启动后端：

```bash
python -m uvicorn app.main:app --app-dir backend --reload --port 8787
```

前端通过 Vite proxy 将 `/api` 请求转发到 `http://127.0.0.1:8787`。

### AI 分析服务

AI 分析侧栏会请求 Python 后端的 `/api/ai/analyze`，后端再调用 OpenAI-compatible Chat Completions 接口。请不要把模型 API Key 放进 Vite 前端环境变量。

Windows PowerShell 可以用当前终端环境变量：

```powershell
$env:LLM_API_KEY="你的 API Key"
$env:LLM_MODEL="gpt-4o-mini"
python -m uvicorn app.main:app --app-dir backend --reload --port 8787
```

也可以在项目根目录或 `backend/` 目录创建 `.env.local`：

```text
LLM_API_KEY=你的 API Key
LLM_BASE_URL=https://api.deepseek.com/v1
LLM_MODEL=deepseek-chat
```

修改配置后需要重启 Python 后端。

可选配置：

```text
DATABASE_URL=mysql+pymysql://seenspace:seenspace@127.0.0.1:3306/seenspace?charset=utf8mb4
CORS_ORIGINS=["http://localhost:7788","http://127.0.0.1:7788"]
LLM_API_KEY=你的 API Key
LLM_BASE_URL=https://api.openai.com/v1
LLM_MODEL=gpt-4o-mini
LLM_TIMEOUT_SECONDS=45
```

如果 Python 后端或模型请求失败，前端 AI 分析会自动降级为本地启发式洞察，保证画布功能仍可使用。

MySQL 需要先创建数据库和用户，示例：

```sql
CREATE DATABASE seenspace CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'seenspace'@'localhost' IDENTIFIED BY 'seenspace';
GRANT ALL PRIVILEGES ON seenspace.* TO 'seenspace'@'localhost';
FLUSH PRIVILEGES;
```

## 常用命令

```bash
pnpm dev       # 启动前端开发服务器
pnpm dev:backend  # 启动 Python 后端
pnpm dev:full  # 同时启动前端和 Python 后端
pnpm build     # 类型检查并构建生产包
pnpm preview   # 预览构建产物
pnpm test      # 运行前端测试
pnpm lint      # 运行 ESLint
```

```bash
python -m uvicorn app.main:app --app-dir backend --reload --port 8787  # 启动后端
python -m pytest backend/tests                                         # 运行后端测试
```

## 项目结构

```text
src/
  app/          应用 Provider 与路由
  components/   跨页面共享组件与工作区检查器
  db/           旧 IndexedDB 客户端，迁移后不再作为主存储
  features/     项目、画布、节点、AI、工作区领域模块
  hooks/        React hooks
  lib/          通用工具函数
  pages/        路由页面
  shared/       与业务无关的共享工具
  styles/       全局样式与主题变量
  types/        跨模块领域类型
backend/
  app/          FastAPI 应用、路由、schema、服务和数据库模型
  tests/        后端接口测试
```

更完整的代码结构、关键类型、模块职责和数据流说明见 [CODE_WIKI.md](./CODE_WIKI.md)。

## 核心架构

应用入口位于 `src/main.tsx`，通过 `ThemeProvider`、`BrowserRouter` 和 `AppRouter` 组合应用壳层。

主要路由：

- `/`：项目列表页。
- `/workspace/:projectId`：工作区画布页。

核心数据模型是 `WorkspaceSnapshot`：

```ts
type WorkspaceSnapshot = {
  nodes: WorkspaceNode[]
  edges: WorkspaceEdge[]
  viewport: Viewport
}
```

项目数据通过 `src/features/project/services/project-service.ts` 请求 Python 后端。工作区页面在画布变更后清洗快照、写入历史栈，并调用 `updateProjectCanvas()` 持久化到后端数据库。

## 测试

当前前端测试基于 Vitest，覆盖随机 ID、工作区服务、画布服务、画布组件和工作区页面等模块。后端测试基于 pytest，覆盖健康检查、项目 API 和 AI 分析 API。

运行：

```bash
pnpm test
python -m pytest backend/tests
```

## 开发文档

- [CODE_WIKI.md](./CODE_WIKI.md)：完整代码 Wiki，包含整体架构、模块职责、关键类与函数、依赖关系、核心数据流和运行方式。
- [SeenSpace-PRD.md](./SeenSpace-PRD.md)：产品需求文档。
- [DEVELOPMENT-CHECKLIST.md](./DEVELOPMENT-CHECKLIST.md)：开发阶段清单。

## 当前说明

AI 分析模块已经接入真实大模型 API，但采用“前端 -> Python 后端 -> OpenAI-compatible 模型接口”的方式，避免把密钥暴露到浏览器。当前前端仍保留本地启发式回退逻辑，用于后端未启动、网络失败或模型返回异常时的兜底。
