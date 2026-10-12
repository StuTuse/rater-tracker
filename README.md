# Rater & Tracker

个人使用的每日评分与任务成长记录器。黄色主题，少量叶绿点缀；离线 Windows 桌面应用。

**当前版本：0.1.0-alpha.3，可读性与动效更新版。** 更清晰的文字层级、金色液态经验条与连续更正反馈；已实现真实评分、任务结算、五页界面、本地持久化、48 枚独立生图徽章、手绘底纹和完整备份。不是 1.0 正式验收版。

## 安装与使用

安装程序：[Rater-Tracker-0.1.0-alpha.3-Setup.exe](release/Rater-Tracker-0.1.0-alpha.3-Setup.exe)。双击安装，选择安装目录；安装后从桌面 `Rater & Tracker` 快捷方式打开。程序包含运行时，无需安装 Node，也无需启动服务。当前产物是未签名的本地预览包。

1. 在今日页选择学习、作品、健康、生活的 0～5 星；空白与 0 星分别处理。
2. 展开原因与依据，离开输入框自动保存。切换日期可以补记、更正。
3. 为独立成果新建任务，在详情里记录推进、阶段和最终交付；归档、恢复、隐藏、延期、撤销和删除各自处理。
4. 历史页查看日历和 7／30 天趋势；奖励中心查看徽章、系数、明细、周期回顾与规则。
5. 设置页编辑评分参照，选择完整／柔和／关闭动效，并导出完整 JSON 备份。恢复前会先要求成功导出当前数据，再覆盖恢复。

日常运行没有联网资源或云服务。关闭窗口即退出，重复启动聚焦原实例；应用打开时提示临近截止／逾期任务。

## 数据与更新

安装目录与用户数据分离。正常桌面数据使用 `%APPDATA%\RaterTracker` 下的 Chromium IndexedDB；设置页显示本机实际路径，并提供打开入口。固定页面来源 `app://rater`，存储名 `rater-tracker`。

更新前先从设置页导出 JSON，再运行新安装程序。不要删除数据目录。备份包括历史分配、取消痕迹、冻结额度和 C、评分星数批次、设置及规则／格式版本；恢复不会重新发奖。浏览器预览与桌面数据互相独立。

本版没有格式迁移：只接受格式 1、规则 v1.3 的完整备份；不支持的格式拒绝导入，保留现存数据。已验证同版本重装、alpha.1 → alpha.2 与 alpha.2 → alpha.3 升级保持数据；以后格式迁移仍需独立验证。

## 开发命令

本机实际环境：Windows 11 x64、Node 24.19.0、npm 11.17.0。锁定 Electron 44.7.0、electron-builder 26.15.3、Playwright CLI 0.1.22；`global-agent` 使用兼容的 4.1.3 override 修复开发依赖漏洞。所有应用资源本地打包，没有前端框架或运行时 npm 依赖。

```powershell
npm ci
npm start                 # Electron 独立窗口，正常用户数据
npm run dev               # 浏览器预览 http://127.0.0.1:4173
npm test                  # 25 项业务测试
npm run check             # 版本、语法、51 张独立素材、业务测试
npm run build             # Windows x64 可运行目录 release/win-unpacked
npm run dist              # Windows x64 NSIS 安装包，不发布
npm run desktop:smoke     # 实际 Electron + 隔离测试数据、截图、结果
```

首次工程安装／打包需要联网下载开发依赖、Electron 与 NSIS；安装好的应用离线运行。脚本直接由 Node 启动工具入口，适配本工作区路径中的空格和 `&`。

检查打包应用与安装流程：

```powershell
node scripts/desktop-smoke.mjs 'release/win-unpacked/Rater & Tracker.exe'
& .\scripts\install-acceptance.ps1
& .\scripts\install-acceptance.ps1 -PreviousInstaller 'release/Rater-Tracker-0.1.0-alpha.2-Setup.exe'
```

安装验收脚本先确认没有既有用户安装，再在工作区 `runtime-data/install-check` 测试安装、快捷方式、单实例、同版本重装；指定 `PreviousInstaller` 则先安装旧版，再安装当前版并检查数据保持。结束卸载测试副本。测试数据使用 `runtime-data/desktop-smoke`，不写入正常数据目录。如果检测到已有安装，脚本停止，避免覆盖它。

浏览器验收使用 Playwright CLI（先 `npm run dev`），在专用测试浏览器执行：

```powershell
node node_modules/@playwright/cli/playwright-cli.js open http://127.0.0.1:4173 --headed
node node_modules/@playwright/cli/playwright-cli.js snapshot
node node_modules/@playwright/cli/playwright-cli.js run-code --filename=scripts/browser-acceptance.cjs
node node_modules/@playwright/cli/playwright-cli.js snapshot
node node_modules/@playwright/cli/playwright-cli.js run-code --filename=scripts/growth-acceptance.cjs
node node_modules/@playwright/cli/playwright-cli.js snapshot
node node_modules/@playwright/cli/playwright-cli.js run-code --filename=scripts/flow-acceptance.cjs
node node_modules/@playwright/cli/playwright-cli.js goto http://127.0.0.1:4173/assets/generated/gallery.html
node node_modules/@playwright/cli/playwright-cli.js run-code --filename=scripts/art-acceptance.cjs
node node_modules/@playwright/cli/playwright-cli.js close
```

这些是验收流程而非用户数据操作；第一个会更正测试浏览器的学习评分，MAX 与 flow 流程使用测试快照并在 `finally` 恢复原快照。截图与报告在 `output/`，测试数据、导出和构建产物均不入库。流光是完整模式的循环装饰，验收只等待有限的反馈动画结束。

## 源码与验证范围

| 路径 | 职责 |
| --- | --- |
| `src/core.js` | 香港日期、纯事务、整数金额、冻结参数、等级与统计 |
| `src/storage.js` | IndexedDB 原子事务、revision 冲突校验、完整备份验证 |
| `src/app.js` / `src/styles.css` | 五页界面、真实状态反馈、动效、任务详情 |
| `assets/generated/` / `src/art.js` / `src/badges.js` | 51 张生图素材、资源入口、名称与门槛；旧 SVG 留作参考 |
| `electron/` | 固定本地来源、安全隔离、单实例、文件对话框 |
| `test/core.test.mjs` | 正式方案的结算与更正场景 |
| `scripts/` | 构建检查、资产生成、预览与实际渲染／安装验收 |
| [数据契约.md](docs/数据契约.md) | 金额精度、历史分配、持久化和备份格式 |
| [0.1验收记录.md](docs/0.1验收记录.md) | 实际检查、产物和未覆盖范围 |

已有验证包含 25 项业务测试、12 项浏览器条件、11 项动效／可读性条件、5 项 MAX 条件、51 张生图资源、实际打包应用和 alpha.2 → alpha.3 安装升级。仍需后续人工体验打磨、长历史量性能检查、60 fps 实测、原生文件对话框完整点击验收及以后数据格式迁移验证。具体范围见 [alpha.3 验收](docs/alpha.3验收记录.md)。

## 文档与版本入口

[交接](SESSION_HANDOFF.md) · [工作日志](WORKLOG.md) · [开发约定](AGENTS.md) · [正式方案 v1.5](最终方案.md) · [视觉与动效规范](视觉与动效规范.md) · [徽章清单](徽章设计清单.md) · [版本管理规范](版本管理规范.md) · [VERSION](VERSION) · [CHANGELOG](CHANGELOG.md)。旧规划／候选仅保留历史。

本地仓库 `main`，规划与旧预览标签保持；本版使用附注标签 `v0.1.0-alpha.3`。未配置 GitHub 远程或推送。

规划模拟仍在 `analysis/`，不能替代应用业务测试；没有重新运行或覆盖历史模拟结果。

生图素材与完整提示词：[清单](docs/生图素材清单.md) · [可离线打开的徽章总览](assets/generated/gallery.html) · [alpha.2 验收](docs/alpha.2验收记录.md)。素材使用内置 image_gen 制作，全部最终图片已保存入项目。

经验条动效预览：[实际录制](output/playwright/alpha3-xp-flow.mp4)；完整动效可在设置中切换为柔和或关闭，系统减少动态优先。录制是本地忽略产物，重新检出源码时不包含该视频。
