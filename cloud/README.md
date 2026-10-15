# CloudBase 账号认证与快照同步

目标环境：`rater-tracker-sync-d3cx88f64aea2`，上海 `ap-shanghai`。
2026-10-13 已部署 PostgreSQL 同步 RPC，并通过真实账号和打包桌面客户端验收。此前的 `rater-health` 事件函数保留为只读连接探针；历史结果见下文。

## 个人账号与安装应用

用户名密码认证已启用；alpha.7 点击应用左下角账号入口登录／注册。注册经邮箱验证码，账号密码确认后由官方 SDK signUp / verifyOtp 完成。控制台仍可创建账号和重置密码；不输入腾讯云管理员密码。登录后旧未登录记录仍独立保留，确认需要上传时在账号中心复制未登录记录，先成功备份当前账号。

2026-10-13邮箱认证配置过程及回读结果：首次只修改登录策略后，回读`EmailLogin=false`；随后启用email身份源与默认代发，再次回读`EmailLogin=true`、`UserNameLogin=true`、`email.On=true`、`email.EmailConfig.On=true`。未启用短信／匿名认证、未购买套餐、未配置私人SMTP凭证。真实收码及注册完成已在Android模拟器验证，身份验证范围见[Android验收记录](../docs/Android验收记录.md)；不能将此范围扩大到实体设备或所有账号情形。

## 验证邮件外观草稿（2026-10-15）

按启动页的视觉制作了[注册／登录验证码模板草稿](email/register-sign-in.html)：淡黄色手账底纹、居中高分辨率启动图标、`Rater & Tracker`、`TuseCreation`和醒目的居中验证码。模板用CloudBase支持的`{{.VerificationCode}}`及有效期变量，未包含脚本或外部样式表。

本次通过`ModifyProvider`提交模板后，`GetProviders`仍回读`EmailConfig.TemplateConfig=null`；CloudBase计费接口也没有返回可核实的套餐信息。官方套餐能力表将“邮件样式”列为标准版部分支持（自定义登录页）及企业版支持的自定义配置；本地已知环境尚未购买套餐，因此当前不能确认该环境具备邮件样式配置权限，也不能称模板已上线。按[官方模板字段说明](https://cloud.tencent.com/document/product/876/34822)的字段重试不会改变这一回读结果。不要未经用户授权升级套餐或新增SMTP服务。邮件正文可显示产品名称与创作者字标；邮箱服务的发件地址仍为默认`cloudbase_noreply@tencent.com`，接口没有提供单独的发件人显示名字段。

官方依据：[PG SDK 注册接口](https://docs.cloudbase.net/api-reference/webv3-pg/authentication)、[内置邮件代发](https://docs.cloudbase.net/authentication-v2/method/email-login)、[邮箱身份源配置](https://docs.cloudbase.net/api-reference/manager/node/login-config)。

环境实际使用 PostgreSQL；没有创建 NoSQL 集合。`migrations/001_sync.sql` 已执行：私有账户快照／请求回执表和 authenticated RPC。owner 取认证上下文，客户端无直接表权限；事务内行锁和版本比较避免覆盖。同请求重试返回原版本，两端修改冲突停止并保留本地数据。云端快照限 4 MiB。

Windows桌面使用官方@cloudbase/js-sdk 3.10.2原生接口，通过受限Electron IPC访问，safeStorage保存加密会话。Android原生客户端也接入认证与快照同步，具体使用范围见Android验收记录。部署凭证只在本机工具配置，不进入应用。免费环境未添加网页安全域名，因此浏览器登录尚未交付；没有购买套餐或关闭桌面隔离。

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

历史验收曾留下两个临时云端验收账号；原记录中的账号ID不再列入项目文档。曾有自动审批拒绝执行外部永久删除的记录；这不是当前待执行的清理授权。任何以后需要删除云端账号的任务，都应先核实账号归属和当前数据，再遵守当时适用的授权要求。

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
