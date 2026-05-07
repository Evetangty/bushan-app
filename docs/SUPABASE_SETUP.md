# Supabase 接入说明（多用户 / 换设备）

你已接受使用第三方云服务。推荐 **Supabase**：内置邮箱/手机号等登录、PostgreSQL、**行级安全（RLS）**，可按用户隔离数据。

## 1. 创建项目

1. 打开 [https://supabase.com](https://supabase.com) 注册并新建 Project。
2. 等待数据库就绪后，进入 **Project Settings → API**，复制：
   - **Project URL**
   - **anon public** key（前端用，配合 RLS 仍安全）

## 2. 本地环境变量

复制仓库里的 `.env.example` 为 `.env`（勿提交到 Git），填入上述两项：

```env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

重启 `npm run dev`。

## 3. 数据库表与 RLS（在 Supabase SQL Editor 执行）

**本节就是文档里常说的「第 3 节建表 SQL」**：只认下面 **「### 3.1 必执行：建表 SQL」** 里的那一个代码块。

### 3.1 必执行：建表 SQL（整段复制）

1. 打开 Supabase 控制台左侧 **SQL Editor** → **New query**。
2. **只复制**下面 `sql` 代码块中的全部内容（从第一行 SQL 到最后一行 SQL，**不要**复制外层的 markdown 标记 `` ``` ``）。
3. 粘贴后点 **Run**（或 `Ctrl+Enter`）。成功应显示 **Success**。

**复制边界（避免漏复制或复制多了）：**

|  | 内容 |
|--|------|
| **起点** | 以 `-- 第3节-建表SQL-开始` 开头的那一行 |
| **终点** | 以 `-- 第3节-建表SQL-结束` 结尾的那一行（含该行） |

以下脚本会创建三张表 `fabrics` / `patterns` / `finished_products`，并强制：**只能读写 `user_id = 当前登录用户` 的行**。

```sql
-- 第3节-建表SQL-开始（复制时请包含本行）
-- 启用扩展（部分项目已默认开启）
create extension if not exists "pgcrypto";

-- ---------- fabrics ----------
create table public.fabrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  image_base64 text not null,
  type text not null,
  source text,
  length_m numeric,
  width_m numeric,
  total_quantity numeric not null,
  price numeric,
  used_quantity numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.fabrics enable row level security;

create policy "fabrics_select_own"
  on public.fabrics for select
  using (auth.uid() = user_id);

create policy "fabrics_insert_own"
  on public.fabrics for insert
  with check (auth.uid() = user_id);

create policy "fabrics_update_own"
  on public.fabrics for update
  using (auth.uid() = user_id);

create policy "fabrics_delete_own"
  on public.fabrics for delete
  using (auth.uid() = user_id);

-- ---------- patterns ----------
create table public.patterns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  image_base64 text not null,
  name text not null,
  source text,
  detail_raw text,
  size_code text,
  bust text,
  waist text,
  hip text,
  length_info text,
  suitable_fabric text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.patterns enable row level security;

create policy "patterns_select_own" on public.patterns for select using (auth.uid() = user_id);
create policy "patterns_insert_own" on public.patterns for insert with check (auth.uid() = user_id);
create policy "patterns_update_own" on public.patterns for update using (auth.uid() = user_id);
create policy "patterns_delete_own" on public.patterns for delete using (auth.uid() = user_id);

-- ---------- finished_products ----------
create table public.finished_products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  image_base64 text not null,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.finished_products enable row level security;

create policy "finished_select_own" on public.finished_products for select using (auth.uid() = user_id);
create policy "finished_insert_own" on public.finished_products for insert with check (auth.uid() = user_id);
create policy "finished_update_own" on public.finished_products for update using (auth.uid() = user_id);
create policy "finished_delete_own" on public.finished_products for delete using (auth.uid() = user_id);

-- 可选：自动更新 updated_at 的触发器（按需添加）
-- 第3节-建表SQL-结束（复制时请包含本行）
```

### 字段与当前前端的对应关系

| 前端 `Fabric`     | 列名              |
|------------------|-------------------|
| id               | id (uuid)         |
| imageBase64      | image_base64      |
| type             | type              |
| source           | source            |
| length           | length_m          |
| width            | width_m           |
| totalQuantity    | total_quantity    |
| price            | price             |
| usedQuantity     | used_quantity     |
| createdAt        | created_at (转 ms)|
| updatedAt        | updated_at        |

纸样 / 成品同理（`name`、`source` 等）。

### 3.2 已建过表的项目：纸样详情字段补丁

如果你之前已执行过旧版 SQL，需要在 SQL Editor 额外执行：

```sql
alter table public.patterns add column if not exists detail_raw text;
alter table public.patterns add column if not exists size_code text;
alter table public.patterns add column if not exists bust text;
alter table public.patterns add column if not exists waist text;
alter table public.patterns add column if not exists hip text;
alter table public.patterns add column if not exists length_info text;
alter table public.patterns add column if not exists suitable_fabric text;
```

## 4. 认证方式（邮箱 + 密码）

1. 打开 **Authentication → Providers → Email**。  
2. 保持 **Enable Email provider** 开启（默认即可使用邮箱密码）。  
3. 若开启 **Confirm email**，用户注册后需点击邮件里的链接才能登录；开发阶段可在同一页面暂时关闭以便快速测试。

前端已实现：**注册**、**登录**、**退出登录**（见 `LoginPage`、`Layout` 右上角）。

前端使用 `src/lib/supabaseClient.ts` 中的 `supabase`：

- `supabase.auth.signUp` / `signInWithPassword` / `signOut`
- 监听 `supabase.auth.onAuthStateChange` 再加载该用户数据

## 5. 图片存储说明

当前应用把图片压成 Base64 存在字段里，**能上云但体积大**。后续可改为 **Supabase Storage**：表里存 `image_path` 或公开 URL，上传用 `supabase.storage`。

## 6. 与本地 SQLite 的关系

- **已配置** `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` 且**已登录**：数据读写走 **Supabase**。
- **未配置** 环境变量：使用浏览器内的 **SQLite（sql.js + WASM）**，整库文件持久化在 **IndexedDB**（`BushanSQLite`）中，不要求登录。

说明：从旧版「Dexie 直存对象」切到本版后，**不会自动迁移**旧 `BushanDB` 里的数据；新数据在独立库中。可选后续：首次登录时「从本机导入到当前账号」或提供导出/导入。
