# SESSION_HANDOFF · 跨会话开发交接

最后更新：2026-10-12，香港时间。产品规范《最终方案》v1.5（结算规则仍为 1.3）；应用版本 **0.1.0-alpha.3**。

## 五分钟接手

1. 读本文件、AGENTS、WORKLOG W009～W012、正式方案，结算特别阅读 4～6 节。
2. 阅读 `docs/数据契约.md`、`docs/alpha.3验收记录.md`；素材见 `docs/生图素材清单.md`，历史检查见 alpha.2 与 0.1 验收记录。
3. 查 `git status --short`、`git log -3 --oneline`、`git tag --list`、`git remote -v`，不覆盖未提交改动。
4. 用户已授权构建 0.1，应用工程已经建立；后续开发无须重复审批已拍板机制。

## 当前真实状态

已从规划基线建立首个可运行／可安装的开发预览。不是 1.0 完整验收版。

| 模块 | 已实现与实际检查 |
| --- | --- |
| 工程 | 原生 HTML/CSS/JS，Electron 44.7.0，electron-builder 26.15.3；Windows x64 |
| 结算 | 评分分批、冻结计划／C、四档窗口、折扣、补录、删除／撤销／恢复、等级与统计；25 项业务测试 |
| 保存 | IndexedDB 完整快照、原子 revision CAS、串行保存、备份结构校验；真实保存失败与冲突注入 |
| 界面 | 今日、任务、历史、奖励中心、设置；任务详情与阶段；7/30 天断点趋势、日历、周期来源回顾 |
| 资产 | 48 个逐枚生图的透明 PNG 徽章、底纹与两张插画；旧 SVG 参考＋应用图标；资源与总览检查 |
| 动效 | 金色液态光层、增长／回退／跨级／MAX；连续显示位置接续；偏好与隐藏暂停；11 项专项与 5 项 MAX 条件 |
| 桌面 | 本地 app 来源、隔离 preload、单实例、JSON 文件接口；实际打包窗口和截图 |
| 安装 | NSIS、桌面快捷方式目标、单实例、alpha.2 → alpha.3 升级数据保持；隔离测试副本已卸载 |
| 尚未覆盖 | 以后格式迁移、Windows 原生文件对话框全程点击、60 fps 实测、长期大数据性能、完整人工体验验收 |

安装包：`release/Rater-Tracker-0.1.0-alpha.3-Setup.exe`，202,686,314 字节，约 193.3 MiB；可运行目录 `release/win-unpacked`。未签名，原图尚未压缩优化。产物不入库，SHA256 与检查范围见 `docs/alpha.3验收记录.md`。

## 文件责任与协作

本轮负责 src/app.js、src/styles.css、浏览器／桌面验收与版本文档；没有改结算核心、存储契约或生图原图。没有派遣／创建其他会话，没有其他会话登记的修改。

| 路径 | 用途 |
| --- | --- |
| `src/core.js` | 唯一数值／日期／结算定义，纯事务 |
| `src/storage.js` | 原子保存、备份校验与恢复契约 |
| `src/app.js`、`src/styles.css` | 五页与详情、真实反馈、动效 |
| `src/art.js`、`src/badges.js`、`assets/generated/` | 51 张生图与入口、徽章元数据、提示词及总览；旧 assets/badges SVG 保留参考 |
| `src/icons.js`、`assets/app.*` | 矢量图标与安装图标 |
| `electron/main.cjs`、`electron/preload.cjs` | 桌面来源、窗口、安全与文件接口 |
| `scripts/` | 预览、资产生成、工程检查、浏览器／桌面／安装验收 |
| `test/core.test.mjs` | 25 项有意义的正式方案测试 |
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
& .\scripts\install-acceptance.ps1 -PreviousInstaller 'release/Rater-Tracker-0.1.0-alpha.2-Setup.exe'
```

安装验收脚本检测已有用户安装则停止；不为此自动卸载已有版本。源码路径含 `&`，工具入口直接经 Node 启动，避免常规 Windows .cmd 垫片解析错误。沙箱可能阻止 Node 子进程、缓存写入或下载；需要时按实际错误使用受审查的执行权限，不改写工程去关闭安全隔离。

首次依赖安装或 dist 会下载 Electron/NSIS，可能需要网络与缓存权限。详细说明与 Playwright CLI 命令在 README。程序正常启动使用持久用户数据；测试命令使用隔离目录。

`scripts/assets.mjs` 从权威清单生成徽章元数据和各个明确手绘路径；设计迭代应同步生成源，防止重跑覆盖资产。`analysis/` 保留原规划结果，本次未重跑。

## 检查与后续

本轮 25 项纯业务测试、12 项浏览器条件、11 项流光／可读性条件与 5 项 MAX 条件通过；实际安装版 51 张解码、48 枚徽章、光层移动与 alpha.2 → alpha.3 升级通过。alpha.2 的 7 项素材条件为历史检查，本轮未重跑图片 alpha 测量。桌面／安装报告位于 `output/desktop`、`output/install`，截图及 MP4 位于 `output/playwright`；均忽略。主屏幕在实际 Electron 渲染检查过，不以构建成功代替视觉检查。

仍需人工连续使用、完整动效帧率／GPU 和长列表性能测量、Windows 原生文件对话框点击及完整辅助功能检查。已验证同格式 alpha.1 → alpha.2、alpha.2 → alpha.3 升级，不能推广为以后格式迁移已通过。文字对比是六类抽样；125% 为 CSS zoom，隐藏检查为事件模拟，详细边界见当前验收记录。

最具体下一步：安装本预览并按真实日常数据体验评分→推进→完成→备份，记录交互／视觉反馈；补齐原生对话框、长数据与性能检查再进入 beta。51 张原图与安装体积可考虑经独立验收的无损优化。

## 版本状态

`VERSION`／package／锁文件为 `0.1.0-alpha.3`；原有规划与预览标签保持，当前里程碑使用附注标签 `v0.1.0-alpha.3`。提交哈希由 Git 查询，不在日志中造自引用哈希。没有配置远程或 GitHub。

alpha.1 源码提交为 `49fda5c`，交接为 `3ae0d46`；alpha.2 素材提交为 `e0be78c`。alpha.3 优化可读性、流光和连续反馈，具体当前提交以 Git 查询为准。

本次工作对应 WORKLOG **W009～W012**。后续结束时追加实际结果、更新本文件与 README，只有检查符合的部分标记完成。

## alpha.2 素材补充

用户明确要求背景、插画与全部 48 枚徽章用生图工具制作；内置 image_gen 已生成 51 张 PNG，位于 assets/generated；manifest.json 保存公共提示词与逐枚主体，gallery.html 是离线总览。src/art.js 是唯一应用位图入口；CSS 引用底纹，叠加奶油色降低对比。旧 assets/badges SVG 保留参考，scripts/assets.mjs 只更新旧矢量与元数据，不会重生成／覆盖生图 PNG。数值、存储格式、数据库来源与用户数据路径不变。验收和安装产物详情见 docs/alpha.2验收记录.md。

本轮复用预先存在的 4173 预览服务；已关闭专用 Playwright 验收浏览器，未擅自结束既有服务。

## alpha.3 动效实现速查

`src/app.js` 的 growthAnimations 只登记有限的 WAAPI 反馈；循环 CSS 光层由 data-flow 与动效偏好管理，不能用取消全部子动画的方式打断它。paintGrowth 写真实值，growthStatic 先取消旧反馈；新反馈捕捉当前显示宽度／数字再衔接。不要在动画回调中结算。浏览器验收的 settle 只等有限动画；新增脚本 `scripts/flow-acceptance.cjs` 使用隔离快照并 finally 恢复。实际录制为 output/playwright/alpha3-xp-flow.mp4，不入库。
