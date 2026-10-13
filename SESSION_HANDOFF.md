# SESSION_HANDOFF · 跨会话开发交接

最后更新：2026-10-13，香港时间。产品规范《最终方案》v1.13、视觉 v1.9（结算规则仍为 1.3）；应用版本 **0.1.0-alpha.11**。

## 五分钟接手

1. 读本文件、AGENTS、WORKLOG 最近 W023、正式方案，结算特别阅读 4～6 节，同步见 8.5。
2. 阅读 `docs/数据契约.md`、`docs/alpha.11验收记录.md`、`cloud/README.md`；素材见 `docs/生图素材清单.md`，历史检查保留在 alpha.2～alpha.10 与 0.1 验收记录。
3. 查 `git status --short`、`git log -3 --oneline`、`git tag --list`、`git remote -v`，不覆盖未提交改动。
4. 用户已授权构建 0.1，应用工程已经建立；后续开发无须重复审批已拍板机制。

## 当前真实状态

alpha.11最新：src/growth-stages.js统一十阶段映射／SVG主体／升级编排。Lv.1～9，随后每十级，90～MAX为阶段十，MAX增加星座环；十个独立主体与十种流动／升级，金色层次与框体渐进丰富。paintStage由当前有效等级绘制，实际保存后升级才播放；退级回退、重载静态，不改门槛和账本。38项工程、9项十阶段真实浏览器、11项flow、5项MAX通过；最终EXE十SVG布局／computed流动及既有账号动效通过，alpha.10→alpha.11升级保持11XP／revision1／路径、快捷方式和单实例，隔离副本卸载。SVG显式fill=none避免开放曲线黑填充；静态窄屏检查等待有限升级动画结束，循环不等待。未测60fps或完整原生逐阶段鼠标操作。

### CloudBase 账号登录与同步 · 2026-10-13

alpha.10最新：新增src/modal.js分离外框几何与关闭清理。登录／注册／验证面板保留form、input和滑块节点，各自草稿保持；已有challenge切到登录再返回仍能填验证码。外框420ms宽高变形（柔和150ms、关闭静态），内容不整体变暗或缩放。关闭期间冻结布局尺寸、保留data-kind与背景滚动锁定，结束后清密码／验证码并返回焦点。尺寸必须读getComputedStyle而非经过缩放的getBoundingClientRect，避免打开途中关闭时重复缩放、文字重排；所有dialog固定定位。快速重开取消旧清理。36项工程、16项动效、账号UI和26项控件通过；最终打包及alpha.9→alpha.10升级、11XP／revision1／路径保持通过，隔离副本卸载。用户新增允许大写开头，src/username.js统一认证标识小写化，显示保留原输入，登录不区分大小写；同名不同大小写是同一账号。注册与登录均适配现有云端小写正则，未批量改云端账号。真实邮箱注册完成仍待用户验证码验收，本轮没有发送登录／注册云端请求。

alpha.9历史：账号弹窗统一窗口正中，取消侧边／底部锚点与角落变换原点。1440px／390px登录和长注册表单居中，账号／任务弹窗computed时长相同。用户真实验证码后错误为invalid SignUpRequest.Username，云端regex要求^[a-z][0-9a-z_-]{5,24}$；原校验允许大写、5位、点等导致验证后拒绝。现界面、客户端发送、原生注册均发码前检查6～25位小写开头及小写／数字／_-，登录上限25，不静默改写大小写。用户需修正账号并重新发码；真实合规新账号完成注册仍待复验，没有用户验证码，不声称真实注册成功。

alpha.8最新：用户要求删除设置账号管理卡片，账号操作统一放到左下角浮层，并明确清空仅指本机账号数据、保留云端。退出保留本机记录，清空输入只清表单；清空本机数据须先成功导出最新完整备份、暂停同步、核对revision后仅删除当前账号快照／同步元数据，再移除本机会话和记忆。云端、未登录、其他账号保持；导出取消／版本冲突中止，重新登录可下载云端。未注销任何云端账号。

用户授权完善应用端账号登录与同步。指定体验环境 `rater-tracker-sync-d3cx88f64aea2`（上海 ap-shanghai，到期 2027-04-12）实际为 PostgreSQL；001_sync.sql 已部署。用户名密码认证启用；alpha.7新增左下角头像／账号／密码掩码入口，点击打开统一风格登录／注册／账号中心。邮箱验证码注册已接入官方接口，邮箱身份源、内置代发和邮箱开关实际回读开启；真实收件至云端新账号完成尚待用户邮箱验收。密码重置仍在控制台。官方 Node SDK 经受限 IPC 登录与 RPC，同步会话系统加密保存，无管理员凭证入包。

首次为完整快照版本同步：保存与 dirty 原子写入，稳定 inFlight 重试、云端行锁 CAS 和回执；按认证 UID 隔离，冲突暂停并保留本地。选择云端和复制旧记录先成功导出备份。未登录／各账号独立，不自动上传旧个人数据，不重算历史奖励。不是操作级合并或云端统一结算，容量 4 MiB。免费计划不允许添加网页安全域名，桌面原生 SDK 已实测，手机／网页客户端待后续。rater-health 保留；W015／W016 为历史接入记录。

云端两账号隔离、重试、冲突、退出及打包桌面登录／会话恢复通过。两个验收账号永久清理被自动审批拒绝，已向用户请求授权，目前保留：2109848299591114753、2109850418322677762。仅允许清理这些指定测试账号及其虚构记录，不能处理其他账号；凭证文件在忽略的 runtime-data/cloud-test。

已从规划基线建立首个可运行／可安装的开发预览。不是 1.0 完整验收版。

| 模块 | 已实现与实际检查 |
| --- | --- |
| 工程 | 原生 HTML/CSS/JS，Electron 44.7.0，electron-builder 26.15.3；Windows x64 |
| 结算 | 评分分批、冻结计划／C、四档窗口、折扣、补录、删除／撤销／恢复、等级与统计；25 项业务测试 |
| 保存 | IndexedDB 完整快照、原子 revision CAS、串行保存、备份结构校验；真实保存失败与冲突注入 |
| 界面 | 五页与任务详情；原位更新、局部星级反馈；应用内下拉／月历、横向选中滑块、双向弹窗／折叠动画，隐藏系统滚动条；26 项控件与 12 项交互条件 |
| 资产 | 48 个逐枚生图的透明 PNG 徽章、底纹与两张插画；旧 SVG 参考＋应用图标；资源与总览检查 |
| 动效 | 金色液态光层、增长／回退／跨级／MAX；连续显示位置接续；偏好与隐藏暂停；11 项专项与 5 项 MAX 条件 |
| 十阶段成长 | 十个独立SVG等级主体、十种流动和升级编排；阶段回退与MAX最终形态；2项边界单元＋9项浏览器＋最终桌面渲染 |
| 桌面 | 本地 app 来源、隔离 preload、单实例、JSON 文件接口；实际打包窗口和截图 |
| 账号与同步 | 官方用户名密码登录；未登录与账号隔离、自动快照同步、冲突保留、加密会话；5 项同步测试＋真实云端／桌面检查 |
| 账号组件 | 稳定登录／注册／验证码面板与草稿、420ms外框变形、消散后清理；大写开头与不区分大小写认证；16项动效专项和5项注册测试 |
| 本机账号清空 | 最新备份＋暂停同步＋revision保护；只清当前本机账号，云端快照实际保持，取消导出不清空 |
| 安装 | NSIS、桌面快捷方式目标、单实例、alpha.10 → alpha.11 升级数据保持；隔离测试副本已卸载 |
| 尚未覆盖 | 以后格式迁移、Windows 原生文件对话框全程点击、60 fps 实测、长期大数据性能、完整人工体验验收 |

安装包：`release/Rater-Tracker-0.1.0-alpha.11-Setup.exe`，203,241,874 字节；可运行目录 `release/win-unpacked`。未签名，原图尚未压缩优化。产物不入库，SHA256 与检查范围见 `docs/alpha.11验收记录.md`。

## 文件责任与协作

alpha.11负责growth-stages／app／styles、阶段单元与浏览器脚本、check／Electron smoke和版本／规范文档。未改core／storage／账号认证／云端SDK／SQL／生图；未派遣其他会话。原账号动效保持，真实邮箱注册、长期数据／性能仍待后续。当前工作范围结束，按实际反馈继续。

本轮专用account-motion／account-regression／growth-stages浏览器和自建4173预览服务已关闭。后续预览需重新npm run dev；用户应用不提供热更新，退出后重新打开开发验收快捷方式。

alpha.10本轮负责app／新增modal／username／styles、account客户端与原生account／registration、Electron smoke、账号UI／动效脚本、注册单元、数据契约与版本／规范／交接。未改core／storage／云端SDK／SQL／生图或云端身份配置；没有派遣会话。真实邮箱注册、云端同步与永久删除旧测试账号本轮未操作。

alpha.9本轮负责styles／app／account客户端，Electron registration／account／smoke、账号UI脚本／注册回归测试和规范文档。未改core、storage、SQL、SDK、云端配置或数据清空语义；无派遣其他会话。35项检查与最终打包登录／同步／居中通过，本轮未重做NSIS升级安装。

alpha.8本轮负责app／storage／styles、Electron账号清空smoke、账号UI脚本／同步清空测试和版本／规范／交接。未改core、SDK、SQL、云端认证配置或生图素材。34项检查、UI取消／最新备份／本机清空、真实源码和最终EXE云端快照保持、alpha.7→alpha.8升级通过；未派遣其他会话。

本轮负责 src/app.js、storage.js、account.js、sync.js、vendor、index.html、Electron account／main／preload／SDK、cloud SQL／工具／依赖、同步测试、桌面账号验收脚本与版本文档。没有改结算核心或生图原图，没有派遣／创建其他会话。规则和备份格式不变。

alpha.7本轮范围：src/app.js／account.js／icons.js／styles.css、electron/account.cjs／registration.cjs／main／preload、注册单元与账号UI验收、版本和规范文档。未改core／storage／SQL或SDK生成物。33项检查、真实打包登录／头像掩码浮层及升级通过；邮箱注册UI传输模拟，真实收码未验收。重建后的桌面源码快捷方式可直接打开新入口，无须每轮安装。

| 路径 | 用途 |
| --- | --- |
| `src/core.js` | 唯一数值／日期／结算定义，纯事务 |
| `src/storage.js` | 原子保存、账号命名空间、同步元数据、备份校验与恢复契约 |
| `src/account.js`、`src/sync.js`、`electron/account.cjs`、`cloud/` | 认证、会话加密、同步队列、官方 SDK 构建、SQL RPC 与云端验收 |
| `src/app.js`、`src/dom.js`、`src/controls.js`、`src/styles.css` | 五页与详情、原位更新、应用内菜单／月历／滑块、真实反馈与动效 |
| `src/modal.js` | 外框尺寸插值、退出期间几何与布局保持、结束清理、重开取消旧回调；账号内容使用稳定DOM更新 |
| `src/username.js` | 唯一大小写兼容校验与认证标识转换；注册与登录共用，显示标签保留原输入 |
| `src/art.js`、`src/badges.js`、`assets/generated/` | 51 张生图与入口、徽章元数据、提示词及总览；旧 assets/badges SVG 保留参考 |
| `src/icons.js`、`assets/app.*` | 矢量图标与安装图标 |
| `electron/main.cjs`、`electron/preload.cjs` | 桌面来源、窗口、安全与文件接口 |
| `scripts/` | 预览、资产生成、工程检查、浏览器／桌面／安装验收 |
| `test/core.test.mjs`、`test/sync.test.mjs`、`test/registration.test.mjs` | 25 项正式方案＋6 项同步／本机清空＋5项注册验证流程测试 |
| `docs/` | 数据契约与实际验收记录 |

登记不是文件锁。后续用户安排并行时先协调共享入口，不能在共用目录各自切分支。

## 实现契约速查

- 所有金额用整数 micro-XP（1e6=1 XP），BigInt 有理数乘除、逐笔四舍五入；不从一位小数展示值回退。
- 评分基础与每颗星独立批次，减星 LIFO；总 XP 仅有效 ledger.actual 汇总。
- 完成基础与每个 2% 持续份额分别保存；推进保留取消正常额度痕迹，其他任务已冻结 C 不重算。
- 快照 `format=1`、`rule=1.3`；每次事务唯一操作 ID＋revision。导入完整替换，先导出当前数据，只调整 revision，不调用奖励事务。
- 桌面稳定 appId `local.ratertracker.desktop`，来源 `app://rater`，数据库 `rater-tracker`；正常用户数据 `%APPDATA%/RaterTracker`，与安装目录分离。
- smoke／安装验收使用工作区 `runtime-data/desktop-smoke`；测试不写正常数据目录。无跨格式迁移，未知格式拒绝并保留数据。
- 动画从已保存 before/after 状态展示，不参与结算；保存失败不显示获得奖励。

复杂删除、持续份额与同日恢复必须读正式方案和数据契约，不能只根据当前任务状态重新计算旧奖励。

## 环境与真实命令

2026-10-13 新增桌面 `Rater & Tracker（开发验收）.lnk`，指向当前项目 node_modules/electron/dist/electron.exe，参数为项目绝对路径，工作目录为项目，图标 assets/app.ico。无需每轮重装，保存源码后退出应用并重开即可看到最新改动；不提供运行中热更新。正常数据和安装版共用，已有安装版运行时单实例会聚焦原窗口，因此先退出旧实例。重建命令：`& .\scripts\create-desktop-shortcut.ps1`。本轮只负责该脚本与 README／日志／本交接，未修改业务代码。桌面文件不入库。

Windows 11 x64（10.0.26200）、Node 24.19.0、npm 11.17.0、Git 2.53.0.windows.2。开发依赖锁定；global-agent 4.1.3 override 后 npm audit 为 0 个已知漏洞。日常运行无需网络。

```powershell
npm start
npm run dev
npm test
npm run check
npm run build
npm run dist
npm run desktop:smoke
node scripts/desktop-smoke.mjs 'release/win-unpacked/Rater & Tracker.exe'
& .\scripts\install-acceptance.ps1
& .\scripts\install-acceptance.ps1 -PreviousInstaller 'release/Rater-Tracker-0.1.0-alpha.5-Setup.exe'
node cloud/build.mjs
node cloud/migrate.cjs
node cloud/account-acceptance.cjs
node scripts/account-desktop-smoke.mjs 'release/win-unpacked/Rater & Tracker.exe'
& .\scripts\install-acceptance.ps1 -PreviousInstaller 'release/Rater-Tracker-0.1.0-alpha.6-Setup.exe'
node node_modules/@playwright/cli/playwright-cli.js -s=account-component run-code --filename=scripts/account-ui-acceptance.cjs
node node_modules/@playwright/cli/playwright-cli.js -s=account-motion run-code --filename=scripts/account-motion-acceptance.cjs
& .\scripts\install-acceptance.ps1 -PreviousInstaller 'release/Rater-Tracker-0.1.0-alpha.9-Setup.exe'
node node_modules/@playwright/cli/playwright-cli.js -s=growth-stages run-code --filename=scripts/stages-acceptance.cjs
& .\scripts\install-acceptance.ps1 -PreviousInstaller 'release/Rater-Tracker-0.1.0-alpha.10-Setup.exe'
node node_modules/electron-builder/cli.js --win nsis --x64 --publish never --config.electronDist=node_modules/electron/dist
```

安装验收脚本检测已有用户安装则停止；不为此自动卸载已有版本。源码路径含 `&`，工具入口直接经 Node 启动，避免常规 Windows .cmd 垫片解析错误。沙箱可能阻止 Node 子进程、缓存写入或下载；需要时按实际错误使用受审查的执行权限，不改写工程去关闭安全隔离。

首次依赖安装或 dist 会下载 Electron/NSIS，可能需要网络与缓存权限。详细说明与 Playwright CLI 命令在 README。程序正常启动使用持久用户数据；测试命令使用隔离目录。

`scripts/assets.mjs` 从权威清单生成徽章元数据和各个明确手绘路径；设计迭代应同步生成源，防止重跑覆盖资产。`analysis/` 保留原规划结果，本次未重跑。

## 检查与后续

alpha.11当前：38/38，9项阶段、11项flow及5项MAX通过。stages脚本用核心真实任务事务生成经验，再通过真实评分保存触发十个目的阶段的升级；撤回退级、静态重载、MAX阶段十、390px稳定布局、柔和／关闭通过。最终桌面包三个新增阶段检查与既有账号动效通过，安装升级通过。默认dist下载连接超时，使用本机同版本Electron成功打包；具体证据与边界见alpha.11验收。十图总览是验收临时视图，不是新增产品页面。

alpha.9当前：35/35；用户错误精确对照旧客户端与云端regex，新增大写／5位／不支持标点／26位不发请求、6／25位及_-合规通过入口的回归。Playwright account-centered 检查桌面／窄屏登录和长注册居中、无横向溢出、共同dialog时长及既有退出／清空条件通过（注册传输模拟）。最终alpha.9真实账号登录／云同步11XP／v1、密码掩码、加密会话及两轴中心偏差<2px通过。未重测安装升级、真实注册收码至成功仍待用户复验；历史alpha.8升级结果不能推广为本轮已测。

alpha.8当前：34/34；UI设置入口移除、清空输入／取消确认、取消导出保留数据、备份最新虚构输入后清本机通过。真实源码／最终EXE备份落盘、本机快照与会话清除、重新认证后云端快照及版本完全相同通过。alpha.7→alpha.8安装升级、11XP／revision1／路径、快捷方式／单实例通过，隔离安装副本卸载。清空smoke设置RATER_ACCOUNT_CLEAR_SMOKE=1，仅测试模式自动选择隔离备份路径；正常原生文件对话框仍需人工完整检查。

alpha.7当前：33项检查通过；账号UI真实鼠标／键盘与窄屏检查、源码及最终EXE真实登录／云同步／左下角掩码／浮层通过；alpha.6→alpha.7安装升级通过，隔离测试安装副本卸载。邮箱注册逻辑和UI模拟检查通过，云端邮箱／代发开关开启；真实收件至注册完成待用户邮箱验收。专用account-component浏览器及本轮预览服务已关闭。下面保留alpha.6的实际检查范围，不当成alpha.7全量专项重测。

本轮 npm run check 为 30/30，云端真实两账号测试通过；源码和最终打包 EXE 账号 smoke 登录下载 11 XP、云端 v1、加密会话与重启恢复通过。浏览器390px卡片无溢出、密码掩码；不是浏览器认证验收。alpha.5 → alpha.6 升级保持 11 XP、revision=1 与数据路径，快捷方式／单实例通过，隔离安装副本已卸载。26 项控件、12 项浏览器、12 项 UI、11 项 flow 和 5 项 MAX 为 alpha.5 历史专项，本轮未全量重跑；安装 smoke 验证菜单、日历与动画基础行为。报告在 output/desktop/account、output/install、.playwright-cli，均忽略。

下一步：用户点击左下角头像注册／登录，真实邮箱收码完成验收，按需复制旧未登录记录。未来多端客户端需另行解决网页安全域名／套餐约束及手机交付；若需要自动合并，须新增业务操作协议，不能直接合并 ledger 或从任务现状重算旧奖励。云端服务期满后的续费／方案另行决定，本轮未购买套餐。

控件浮层必须挂到所属 dialog 内才能接收模态环境真实点击；退出浮层立即 inert／aria-hidden，清理在动画后进行。data-persistent-ui 标记由控件模块管理，DOM 更新跳过这些生成节点，控件增强阶段清理孤立按钮。不要改回按全局字段序号识别控件。桌面 smoke 的后台窗口仅在测试模式禁用节流以避免截图旧帧；不把该检查当成性能测试。

仍需人工连续使用、动效帧率／GPU 和长列表性能测量、Windows 原生文件对话框点击及完整辅助功能检查。已验证多个同格式 alpha 升级，不能推广为以后格式迁移。文字对比是历史六类抽样；125% 为 CSS zoom，隐藏检查为事件模拟。桌面 smoke 使用 DOM 事件，真实菜单鼠标／键盘在浏览器验证，详细边界见当前验收记录。

最具体下一步：安装本预览并按真实日常数据体验评分→推进→完成→备份，记录交互／视觉反馈；补齐原生对话框、长数据与性能检查再进入 beta。51 张原图与安装体积可考虑经独立验收的无损优化。

## 版本状态

`VERSION`／package／锁文件为 `0.1.0-alpha.11`；原有规划与预览标签保持，当前里程碑使用附注标签 `v0.1.0-alpha.11`。提交哈希由 Git 查询，不在日志中造自引用哈希。没有配置远程或 GitHub。

alpha.1 源码提交为 `49fda5c`，交接为 `3ae0d46`；alpha.2 素材提交为 `e0be78c`。alpha.3 提交 41562cc，alpha.4 提交 3ba94e1；alpha.5 统一应用内控件与二级界面动效，具体当前提交以 Git 查询为准。

最近工作对应 WORKLOG **W023**。后续结束时追加实际结果、更新本文件与 README，只有检查符合的部分标记完成。

## alpha.2 素材补充

用户明确要求背景、插画与全部 48 枚徽章用生图工具制作；内置 image_gen 已生成 51 张 PNG，位于 assets/generated；manifest.json 保存公共提示词与逐枚主体，gallery.html 是离线总览。src/art.js 是唯一应用位图入口；CSS 引用底纹，叠加奶油色降低对比。旧 assets/badges SVG 保留参考，scripts/assets.mjs 只更新旧矢量与元数据，不会重生成／覆盖生图 PNG。数值、存储格式、数据库来源与用户数据路径不变。验收和安装产物详情见 docs/alpha.2验收记录.md。

本轮复用预先存在的 4173 预览服务；已关闭专用 Playwright 验收浏览器，未擅自结束既有服务。

## alpha.3 动效实现速查

`src/app.js` 的 growthAnimations 只登记有限的 WAAPI 反馈；循环 CSS 光层由 data-flow 与动效偏好管理，不能用取消全部子动画的方式打断它。paintGrowth 写真实值，growthStatic 先取消旧反馈；新反馈捕捉当前显示宽度／数字再衔接。不要在动画回调中结算。浏览器验收的 settle 只等有限动画；新增脚本 `scripts/flow-acceptance.cjs` 使用隔离快照并 finally 恢复。实际录制为 output/playwright/alpha3-xp-flow.mp4，不入库。

## alpha.4 原位更新速查

`src/dom.js` 比较元素、文本与稳定键，只更新变化的属性和子节点。评分卡片以日期／维度为键，任务卡片以任务 ID 为键；按钮按 action 与参数识别。`renderContent` 和 `refreshTaskDialog` 使用它，不能恢复为每次保存整体 innerHTML 替换。输入值与 details.open 按 preserveInputs 管理，导入清除草稿并允许重置。

`animateStar` 只响应已提交的 lit 变化，SVG 动画按元素登记、重复更正取消旧动画；悬停／键盘预览使用独立 class，不修改状态。普通评分通过局部数值和经验条反馈，不重复 toast；备注等无经验变化的保存不打断正在播放的经验反馈。规则、格式与素材未变。新增 scripts/ui-acceptance.cjs 检查 DOM 身份、草稿、失败、连续点击和偏好，finally 恢复隔离浏览器快照。静态渲染使用 static-update 抑制星图标颜色过渡，提交保存才调用 animateStar。UI 事务等待使用 evaluate 内轮询 revision，不用 async waitForFunction 判断保存完成。flow 的接续检查把真实 WAAPI 暂停到 25% 后提交第二次评分，避免遮挡窗口的 rAF 节奏错过中断；它是受控渲染检查，不能作为实时性能测量。
