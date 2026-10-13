# CloudBase 账号认证与快照同步

目标环境：`rater-tracker-sync-d3cx88f64aea2`，上海 `ap-shanghai`。
2026-10-13 已部署 PostgreSQL 同步 RPC，并通过真实账号和打包桌面客户端验收。此前的 `rater-health` 事件函数保留为只读连接探针；历史结果见下文。

## 个人账号与安装应用

在该环境控制台的身份认证／用户管理创建用户名密码用户，已启用 UsernameLogin。应用设置页使用这个应用账号登录，不输入腾讯云管理员密码。首版没有自助注册或找回密码页；修改密码在控制台完成。登录后旧未登录记录仍独立保留，确认需要上传时用“将未登录记录复制到此账号”，先成功备份当前账号。

环境实际使用 PostgreSQL；没有创建 NoSQL 集合。`migrations/001_sync.sql` 已执行：私有账户快照／请求回执表和 authenticated RPC。owner 取认证上下文，客户端无直接表权限；事务内行锁和版本比较避免覆盖。同请求重试返回原版本，两端修改冲突停止并保留本地数据。云端快照限 4 MiB。

桌面使用官方 @cloudbase/js-sdk 3.10.2 的原生接口，通过受限 Electron IPC 访问，safeStorage 保存加密会话。部署凭证只在本机工具配置，不进入应用。免费环境拒绝添加网页安全域名，浏览器／手机登录尚未交付；没有购买套餐或关闭桌面隔离。

## 工程与验收命令

在根目录执行：

```powershell
npm ci --prefix cloud
node cloud/build.mjs
node cloud/migrate.cjs
node cloud/account-acceptance.cjs
node scripts/account-desktop-smoke.mjs 'release/win-unpacked/Rater & Tracker.exe'
```

build 生成并提交 src/vendor/cloudbase.js 与 electron/cloudbase.cjs，打包无需 cloud/node_modules。migrate 通过已登录 CLI 将受版本控制的 SQL 部署到上述固定环境；不安装其他环境。

account-acceptance 会创建一次性 externalUser 和虚构 11 XP 数据，验证登录／退出、账号隔离、上传下载、重复请求和旧版本冲突；第二账号检查后删除，第一账号保留供桌面测试。凭证仅写入忽略的 runtime-data/cloud-test/account.json，不输出密码。desktop-smoke 使用独立 runtime-data/account-package，不访问正常用户目录。再次运行验收应先记录旧测试账号并在获授权后清理，不能删除其他用户。

本轮两个临时验收账号 ID 为 2109848299591114753、2109850418322677762。自动审批因外部永久删除缺少明确授权拒绝收尾清理，目前保留，等待用户确认；不是个人正式账号。

实际结果与边界见 ../docs/alpha.6验收记录.md。SDK 及依赖许可证保留于生成文件法律注释和依赖包；SDK 官方源码：https://github.com/TencentCloudBase/cloudbase-js-sdk 。

## 本地检查

在项目根目录执行：

```powershell
node --test --test-isolation=none cloud/health.test.cjs
```

## 部署准备

CloudBase CLI 3.8.6 已在本目录局部安装并锁定，不改变桌面依赖。在本目录执行：

```powershell
node node_modules/@cloudbase/cli/bin/tcb login --flow device
node node_modules/@cloudbase/cli/bin/tcb fn deploy rater-health -e rater-tracker-sync-d3cx88f64aea2 --region ap-shanghai
```

运行时 `Nodejs18.15` 已通过当前环境的部署和调用验证。
部署前核对环境，部署后通过控制台云端测试调用，预期返回 `ok=true` 和指定 service。
2026-10-13 实际部署成功，并执行以下调用成功：

```powershell
node node_modules/@cloudbase/cli/bin/tcb fn invoke rater-health -e rater-tracker-sync-d3cx88f64aea2 --region ap-shanghai --json
```

云端返回 `InvokeResult=0`、`ErrMsg=""`，RetMsg 为 `service=rater-tracker-health`、`protocol=1`、`ok=true`、`serverTime=2026-10-13T02:28:56.973Z`。请求 ID `f93e671a-df5e-488d-a5d3-f9f44f5a20cb`。这是管理员 CLI 调用验证，不能替代桌面用户身份认证和客户端网络验收。

2026-10-12：本地只读探针检查 1/1 通过。普通测试入口因沙箱子进程 EPERM 失败，关闭测试进程隔离后通过。部署工具安装成功，已发起设备授权，等待用户在官方页面完成登录；授权码与链接为短期信息，不记入源码。工具配置在用户目录，不入库。

以上探针记录是接入历史；本版已另行完成账号与桌面检查。不要把个人数据库设置为公共读写，不将部署凭证纳入仓库。
官方依据：https://docs.cloudbase.net/cli-v1/quick-start
