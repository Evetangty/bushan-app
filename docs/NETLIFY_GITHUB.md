# Netlify + GitHub 部署（布山手作）

## 0. 先解决「没有 git 命令」

在 PowerShell 里执行 `git --version`，若提示找不到命令：

1. 打开 [https://git-scm.com/download/win](https://git-scm.com/download/win) 下载安装 **Git for Windows**（一路 Next 即可，勾选 “Add Git to PATH”）。
2. **关掉并重新打开**终端，再执行 `git --version` 应能显示版本号。

（也可用 `winget install Git.Git`，装完后同样要新开终端。）

## 1. 在 GitHub 新建空仓库

1. 打开 GitHub → **New repository**
2. 仓库名例如 `bushan-app`，选 **Public**，**不要**勾选 “Add a README”（保持空仓库更好接本地）。
3. 创建后复制仓库地址，例如：  
   `https://github.com/你的用户名/bushan-app.git`

## 2. 本地初始化并推送

在 PowerShell 中执行（把最后一行的 URL 换成你的）：

```powershell
cd e:\workspace\bushan-app
git init
git add .
git commit -m "chore: initial commit for Netlify"
git branch -M main
git remote add origin https://github.com/你的用户名/bushan-app.git
git push -u origin main
```

第一次 `git push` 可能弹出 GitHub 登录：按提示用浏览器授权，或使用 **Personal Access Token** 作为密码。

## 3. Netlify 连接 GitHub

1. Netlify → **Add new project** → **Import a Git repository** → **GitHub**
2. 选中 `bushan-app` 仓库
3. 构建设置一般会自动读 `netlify.toml`：
   - Build：`npm run build`
   - Publish：`dist`
4. 在 **Environment variables** 添加：
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. **Deploy**

## 4. Supabase 生产域名

**Authentication → URL Configuration → Site URL** 填你的 Netlify 地址，例如 `https://xxx.netlify.app`。

## 说明

- 项目根目录已有 `public/_redirects` 与 `netlify.toml` 的 SPA 回退，避免刷新子路由 404。
- 勿将 `.env` 提交到 Git（已在 `.gitignore`）；密钥只在 Netlify 后台配置。
