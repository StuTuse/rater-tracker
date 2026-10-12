# SESSION_HANDOFF · 跨会话开发交接

最后更新：2026-10-12，香港时间。产品规则《最终方案》v1.3；应用版本 **0.1.0-alpha.1**。

## 五分钟接手

1. 读本文件、AGENTS、WORKLOG W009、正式方案，结算特别阅读 4～6 节。
2. 阅读 `docs/数据契约.md`、`docs/0.1验收记录.md`；视觉依据仍为专项规范与徽章清单。
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
| 资产 | 48 个独立 SVG 徽章＋应用 SVG/PNG/ICO；唯一主体自动检查、总览渲染检查 |
| 动效 | XP 增减／升级／降级／跨级／MAX、三档偏好、系统 reduce；真实快速更正与 MAX 恢复检查 |
| 桌面 | 本地 app 来源、隔离 preload、单实例、JSON 文件接口；实际打包窗口和截图 |
| 安装 | NSIS 安装成功、桌面快捷方式目标核对、单实例、同版本重装数据保持；隔离测试副本已卸载 |
| 尚未覆盖 | 跨版本升级、Windows 原生文件对话框全程点击、60 fps 实测、长期大数据性能、完整人工体验验收 |

安装包：`release/Rater-Tracker-0.1.0-alpha.1-Setup.exe`，约 106.3 MiB；可运行目录 `release/win-unpacked`。未签名。产物不入库，SHA256 与检查范围见验收记录。

## 文件责任与协作

本次会话负责并集成全部工程、共享规则、存储契约、UI、资产、Electron、构建脚本、测试与版本文档。没有派遣／创建其他会话，没有其他会话登记的修改。

| 路径 | 用途 |
| --- | --- |
| `src/core.js` | 唯一数值／日期／结算定义，纯事务 |
| `src/storage.js` | 原子保存、备份校验与恢复契约 |
| `src/app.js`、`src/styles.css` | 五页与详情、真实反馈、动效 |
| `src/badges.js`、`assets/badges/` | 48 枚徽章元数据与独立 SVG |
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
```

安装验收脚本检测已有用户安装则停止；不为此自动卸载已有版本。源码路径含 `&`，工具入口直接经 Node 启动，避免常规 Windows .cmd 垫片解析错误。沙箱可能阻止 Node 子进程、缓存写入或下载；需要时按实际错误使用受审查的执行权限，不改写工程去关闭安全隔离。

首次依赖安装或 dist 会下载 Electron/NSIS，可能需要网络与缓存权限。详细说明与 Playwright CLI 命令在 README。程序正常启动使用持久用户数据；测试命令使用隔离目录。

`scripts/assets.mjs` 从权威清单生成徽章元数据和各个明确手绘路径；设计迭代应同步生成源，防止重跑覆盖资产。`analysis/` 保留原规划结果，本次未重跑。

## 检查与后续

25 项纯业务测试、12 项浏览器验收条件、5 项 MAX 界面条件通过；导出／两次导入在浏览器文件选择器流程中检查。桌面／安装报告位于 `output/desktop`、`output/install`，截图位于 `output/playwright`；均忽略。主屏幕在实际 Electron 渲染检查过，不以构建成功代替视觉检查。

仍需人工连续使用、文字可读性／手绘细节打磨、完整动效帧率和长列表性能测量、Windows 原生文件对话框点击、后续真实版本间更新。只测试了同版本重装，不能描述为跨版本升级已通过。首次格式 1 没有历史版本数据迁移可验证。

最具体下一步：安装本预览并按真实日常数据体验评分→推进→完成→备份，记录交互／视觉反馈后修订 alpha.2；补齐原生对话框、长数据和跨版本检查再进入 beta。

## 版本状态

`VERSION`／package／锁文件为 `0.1.0-alpha.1`；规划标签 `v0.1.0-plan.1` 保持，当前里程碑使用附注标签 `v0.1.0-alpha.1`。提交哈希由 Git 查询，不在日志中造自引用哈希。没有配置远程或 GitHub。

本次工作对应 WORKLOG **W009**。后续结束时追加实际结果、更新本文件与 README，只有检查符合的部分标记完成。
