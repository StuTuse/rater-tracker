# Rater & Tracker

个人使用的每日评分与任务成长记录器。黄色主题，少量叶绿点缀；离线 Windows 桌面应用。

**当前版本：0.1.0-alpha.17，淡黄色启动页更新版。** 启动页使用与软件背景一致的纸色（#faf8ef），中央软件图标与名称，底部加粗TuseCreation字标，数据准备后自然消散进入主界面。五页及页内切换动效、顶部92句、勋章窗口／礼花、十阶段成长与登录草稿保持。已实现真实评分、任务结算、本地持久化、48枚独立生图徽章、手绘底纹和完整备份。不是1.0正式验收版。

## 安装与使用

安装程序：[Rater-Tracker-0.1.0-alpha.17-Setup.exe](release/Rater-Tracker-0.1.0-alpha.17-Setup.exe)。双击安装，选择安装目录；安装后从桌面 `Rater & Tracker` 快捷方式打开。程序包含运行时，无需安装 Node，也无需启动服务。当前产物是未签名的本地预览包。

1. 在今日页选择学习、作品、健康、生活的 0～5 星；空白与 0 星分别处理。
2. 展开原因与依据，离开输入框自动保存。切换日期可以补记、更正。
3. 为独立成果新建任务，在详情里记录推进、阶段和最终交付；归档、恢复、隐藏、延期、撤销和删除各自处理。
4. 历史页查看日历和 7／30 天趋势；奖励中心查看徽章、系数、明细、周期回顾与规则。
5. 设置页编辑评分参照，选择完整／柔和／关闭动效，并导出完整 JSON 备份。恢复前会先要求成功导出当前数据，再覆盖恢复。

未登录可完全离线使用；账号同步需要联网。关闭窗口即退出，重复启动聚焦原实例；应用打开时提示临近截止／逾期任务。

## 数据与更新

安装目录与用户数据分离。正常桌面数据使用 `%APPDATA%\RaterTracker` 下的 Chromium IndexedDB；设置页显示本机实际路径，并提供打开入口。固定页面来源 `app://rater`，存储名 `rater-tracker`。

更新前先从设置页导出 JSON，再运行新安装程序。不要删除数据目录。备份包括历史分配、取消痕迹、冻结额度和 C、评分星数批次、设置及规则／格式版本；恢复不会重新发奖。浏览器预览与桌面数据互相独立。

本版没有格式迁移：只接受格式 1、规则 v1.3 的完整备份；不支持的格式拒绝导入，保留现存数据。已验证同版本重装和多个同格式 alpha 升级，最新 alpha.11 → alpha.12 保持经验、事务版本与数据路径；以后格式迁移仍需独立验证。

## 开发命令

桌面 `Rater & Tracker（开发验收）` 快捷方式直接用本项目 Electron 打开最新源码，无需每次打包／安装。保存改动后先退出正在运行的应用（包括已安装版），再双击快捷方式；已打开窗口不会自动热更新。使用正常 `%APPDATA%\RaterTracker` 数据，和安装版共用数据，不是验收脚本的隔离目录。项目目录或依赖路径变化后，在项目根目录执行 `& .\scripts\create-desktop-shortcut.ps1` 重建快捷方式；快捷方式包含机器路径，不入库。

本机实际环境：Windows 11 x64、Node 24.19.0、npm 11.17.0。锁定 Electron 44.7.0、electron-builder 26.15.3、Playwright CLI 0.1.22；`global-agent` 使用兼容的 4.1.3 override 修复开发依赖漏洞。应用资源和官方 CloudBase SDK 本地打包，原生 SDK 使用运行时依赖 ws 8.22.0。

```powershell
npm ci
npm start                 # Electron 独立窗口，正常用户数据
npm run dev               # 浏览器预览 http://127.0.0.1:4173
npm test                  # 25 项业务＋6 项同步／本机清空＋5 项注册＋2 项十阶段＋2 项提示测试
npm run check             # 版本、语法、51 张独立素材、业务测试
npm run build             # Windows x64 可运行目录 release/win-unpacked
npm run dist              # Windows x64 NSIS 安装包，不发布
npm run desktop:smoke     # 实际 Electron + 隔离测试数据、截图、结果
```

首次工程安装／打包需要联网下载开发依赖、Electron 与 NSIS；安装好的应用离线运行。脚本直接由 Node 启动工具入口，适配本工作区路径中的空格和 `&`。

若重复打包等待下载，先确认 node_modules/electron/dist/version 为 44.7.0，可使用本机正式运行时：`node node_modules/electron-builder/cli.js --win nsis --x64 --publish never --config.electronDist=node_modules/electron/dist`。本轮最终安装包采用此命令；仍需先通过 npm run check。

检查打包应用与安装流程：

```powershell
node scripts/desktop-smoke.mjs 'release/win-unpacked/Rater & Tracker.exe'
& .\scripts\install-acceptance.ps1
& .\scripts\install-acceptance.ps1 -PreviousInstaller 'release/Rater-Tracker-0.1.0-alpha.5-Setup.exe'
& .\scripts\install-acceptance.ps1 -PreviousInstaller 'release/Rater-Tracker-0.1.0-alpha.10-Setup.exe'
& .\scripts\install-acceptance.ps1 -PreviousInstaller 'release/Rater-Tracker-0.1.0-alpha.11-Setup.exe'
```

安装验收脚本先确认没有既有用户安装，再在工作区 `runtime-data/install-check` 测试安装、快捷方式、单实例、同版本重装；指定 `PreviousInstaller` 则先安装旧版，再安装当前版并检查数据保持。结束卸载测试副本。测试数据使用 `runtime-data/desktop-smoke`，不写入正常数据目录。如果检测到已有安装，脚本停止，避免覆盖它。

浏览器验收使用 Playwright CLI（先 `npm run dev`），在专用测试浏览器执行：

```powershell
node node_modules/@playwright/cli/playwright-cli.js -s=alpha5-check open http://127.0.0.1:4173
node node_modules/@playwright/cli/playwright-cli.js -s=alpha5-check snapshot
node node_modules/@playwright/cli/playwright-cli.js -s=alpha5-check run-code --filename=scripts/controls-acceptance.cjs
node node_modules/@playwright/cli/playwright-cli.js -s=alpha5-check snapshot
node node_modules/@playwright/cli/playwright-cli.js -s=alpha5-check run-code --filename=scripts/browser-acceptance.cjs
node node_modules/@playwright/cli/playwright-cli.js -s=alpha5-check snapshot
node node_modules/@playwright/cli/playwright-cli.js -s=alpha5-check run-code --filename=scripts/growth-acceptance.cjs
node node_modules/@playwright/cli/playwright-cli.js -s=alpha5-check snapshot
node node_modules/@playwright/cli/playwright-cli.js -s=alpha5-check run-code --filename=scripts/flow-acceptance.cjs
node node_modules/@playwright/cli/playwright-cli.js -s=alpha5-check run-code --filename=scripts/stages-acceptance.cjs
node node_modules/@playwright/cli/playwright-cli.js -s=alpha5-check run-code --filename=scripts/notices-acceptance.cjs
node node_modules/@playwright/cli/playwright-cli.js -s=alpha5-check snapshot
node node_modules/@playwright/cli/playwright-cli.js -s=alpha5-check run-code --filename=scripts/ui-acceptance.cjs
node node_modules/@playwright/cli/playwright-cli.js -s=alpha5-check run-code --filename=scripts/pages-acceptance.cjs
node node_modules/@playwright/cli/playwright-cli.js -s=alpha5-check run-code --filename=scripts/startup-acceptance.cjs
node node_modules/@playwright/cli/playwright-cli.js -s=alpha5-check goto http://127.0.0.1:4173/assets/generated/gallery.html
node node_modules/@playwright/cli/playwright-cli.js -s=alpha5-check run-code --filename=scripts/art-acceptance.cjs
node node_modules/@playwright/cli/playwright-cli.js -s=alpha5-check close
```

这些是验收流程而非用户数据操作；浏览器基础流程会更正测试浏览器的学习评分，controls、UI、MAX 与 flow 流程使用测试快照并在 `finally` 恢复原快照。截图与报告在 `output/`，测试数据、导出和构建产物均不入库。流光是完整模式的循环装饰，验收只等待有限的反馈动画结束。

## 源码与验证范围

| 路径 | 职责 |
| --- | --- |
| `src/core.js` | 香港日期、纯事务、整数金额、冻结参数、等级与统计 |
| `src/storage.js` | IndexedDB 原子事务、revision 冲突校验、完整备份验证 |
| `src/app.js` / `src/dom.js` / `src/controls.js` / `src/styles.css` | 五页界面、原位更新、应用内控件、动效与任务详情 |
| `src/page-motion.js` / `scripts/pages-acceptance.cjs` | 主标签全内容与页内标签入场；有上限错峰、取消、减少动态与真实渲染检查 |
| `src/startup.js` / `scripts/startup-acceptance.cjs` | 静态纸色首屏、软件标识与TuseCreation字标、就绪消散、错误恢复及实际启动帧检查 |
| `src/growth-stages.js` / `test/growth-stages.test.mjs` | 十阶段等级映射、独立SVG主体、升级编排与真实门槛回退检查 |
| `src/notices.js` / `test/notices.test.mjs` | 92句启动短句、九位人物各2～3句、排除相邻重复与勋章提示队列去重／撤回；不参与结算 |
| `assets/generated/` / `src/art.js` / `src/badges.js` | 51 张生图素材、资源入口、名称与门槛；旧 SVG 留作参考 |
| `electron/` | 固定本地来源、安全隔离、单实例、文件对话框 |
| `test/core.test.mjs` | 正式方案的结算与更正场景 |
| `scripts/` | 构建检查、资产生成、预览与实际渲染／安装验收 |
| [数据契约.md](docs/数据契约.md) | 金额精度、历史分配、持久化和备份格式 |
| [0.1验收记录.md](docs/0.1验收记录.md) | 实际检查、产物和未覆盖范围 |

alpha.5 历史验证包含 25 项业务测试、26 项控件条件、12 项浏览器条件、12 项交互条件、11 项动效／可读性条件、5 项 MAX 条件与 51 张生图资源，见 [alpha.5 验收](docs/alpha.5验收记录.md)。alpha.6 检查为 30 项业务／同步测试、真实账号与云端、最终桌面和安装升级，见 [alpha.6 验收](docs/alpha.6验收记录.md)。仍需长历史量性能、60 fps、原生文件对话框完整点击、完整辅助功能和人工连续使用检查。

十阶段范围为Lv.1～9、Lv.10～19，依次至Lv.80～89、Lv.90～MAX。经验门槛保持，撤销或更正后阶段随有效等级回退；打开、导入不重播升级。完整模式显示流光和阶段升级，柔和／关闭减少装饰。38项工程、9项阶段条件和最终桌面检查见[alpha.11验收](docs/alpha.11验收记录.md)。

alpha.12顶部短句运行中保持；上次句子仅作本机界面偏好，不写业务备份。新勋章提示等待当前弹窗或填写结束，多枚在同一窗口切换，点击收下或关闭返回。撤回取消无效提示；恢复／重启不重演，勋章不额外发XP，柔和／关闭／系统减少动态不放礼花。40项工程与21项浏览器专项、实际桌面范围见[alpha.12验收](docs/alpha.12验收记录.md)。

alpha.13将句池扩展到80条（46鼓励／24自问／10名句译文），主题放宽；官方来源见[短句出处](docs/启动短句出处.md)，实际40测试／9项浏览器文本条件与最终桌面检查见[alpha.13验收](docs/alpha.13验收记录.md)。本轮未重测NSIS升级，最近实测仍为alpha.11→alpha.12。

alpha.14新增四位各3句并核对官方／本人出处，总池92句，其中22句名句。英文短译与中文摘句在源码元数据及来源记录中区分；实际检查见[alpha.14验收](docs/alpha.14验收记录.md)，安装升级未重测。

alpha.16白底启动页直接显示本地软件图标、名称和底部粗体TuseCreation，约1.2秒最短展示与数据准备并行。完整320ms消散与主页面入场衔接，柔和150ms、关闭静态；读取失败仍可重试，页内操作不重播。40工程、18项启动浏览器检查、41项切页回归及最终EXE首屏与既有smoke通过，见[alpha.16验收](docs/alpha.16验收记录.md)。本轮未重测安装升级。

alpha.17按新要求把首屏改为软件背景同款淡黄色#faf8ef，窗口首帧同色；40工程、18启动浏览器与最终EXE隔离smoke通过，见[alpha.17验收](docs/alpha.17验收记录.md)。

全标签动画检查见[alpha.15验收](docs/alpha.15验收记录.md)：41项页面条件、12项原位更新、26项控件与最终桌面检查。五个主页面全内容入场，页内标签只动变化部分；原位保存不重播。同一内容组内的文字和控件随组移动，避免父子透明度叠乘。NSIS升级本轮未重测。

## 账号登录、注册与同步（alpha.10）

点击左下角头像入口，弹出登录／注册浮层；已有账号输入账号密码登录。选择“注册账号”，填写账号、邮箱、密码及确认密码，发送并填写邮箱验证码后登录。邮箱认证已开启；已有邮箱可能直接登录已有账号。可以继续在 CloudBase 控制台创建账号，密码重置仍在控制台完成。不要输入腾讯云管理账号密码。切换菜单保留各表单与验证码；关闭消散结束后清空密码和验证码，非敏感草稿保留到本次应用运行结束，均不写入备份或凭证。

弹窗在窗口正中，打开／关闭使用配对的淡入淡出和收放，切换仅用420ms外框尺寸变形，内容不闪烁、不整体缩放。柔和150ms，关闭动效静态。关闭途中保持外框、内容与背景滚动锁定，消散结束后再清理。注册账号须为6～25位英文字母、数字、_或-，字母开头，可用大写，例如Rater_01。界面保留原输入显示；注册和登录统一使用小写认证标识，登录不区分大小写，不会创建仅大小写不同的两个账号。发码前即校验。

未登录记录保留在原位置；各账号独立保存。若要同步此前记录，登录后使用“将未登录记录复制到此账号”，先导出当前账号备份。应用打开期间自动同步，也可立即同步。两台离线设备修改会提示冲突；先备份再选择云端，不自动合并奖励账本。

所有账号操作在左下角浮层内，设置页不再提供重复入口。“退出账号”保留本机账号记录；“清空本机账号数据”先导出完整备份，再删除当前账号的本机快照／同步缓存并退出，云端、未登录记录与其他账号不受影响。取消导出就取消清空；未同步改动需从导出的备份找回。重新登录可从云端恢复。登录／注册表单还提供“清空输入”。

桌面会话系统加密保存，退出返回未登录数据；导出不包含凭证。服务停服或断网仍可本机使用。首版快照容量限 4 MiB，浏览器／手机登录未交付。居中与注册修正检查见 [alpha.9 验收](docs/alpha.9验收记录.md)；使用合规账号的真实邮箱收码至注册完成仍待用户复验。

连续弹窗与草稿检查见 [alpha.10 验收](docs/alpha.10验收记录.md)：16项动效、账号UI、26项控件与最终打包／升级检查通过；36项工程检查包含大写用户名映射。本轮未重做云端认证实测。

开发／验收新增命令：

```powershell
npm ci --prefix cloud
node cloud/build.mjs
node cloud/migrate.cjs
node cloud/account-acceptance.cjs
node scripts/account-desktop-smoke.mjs 'release/win-unpacked/Rater & Tracker.exe'
# 仅使用隔离临时账号检查清空与云端保持；测试备份自动保存在隔离数据目录
$env:RATER_ACCOUNT_CLEAR_SMOKE='1'
node scripts/account-desktop-smoke.mjs 'release/win-unpacked/Rater & Tracker.exe'
Remove-Item Env:RATER_ACCOUNT_CLEAR_SMOKE
node node_modules/@playwright/cli/playwright-cli.js -s=account-component open http://127.0.0.1:4173
node node_modules/@playwright/cli/playwright-cli.js -s=account-component run-code --filename=scripts/account-ui-acceptance.cjs
node node_modules/@playwright/cli/playwright-cli.js -s=account-motion open http://127.0.0.1:4173
node node_modules/@playwright/cli/playwright-cli.js -s=account-motion run-code --filename=scripts/account-motion-acceptance.cjs
node node_modules/@playwright/cli/playwright-cli.js -s=account-motion close
node node_modules/@playwright/cli/playwright-cli.js -s=account-component close
```

迁移和云端验收需要 CloudBase CLI 本机登录；验收会创建临时账号及虚构数据，详见 cloud/README。UI验收先启动 npm run dev，传输使用模拟，不证明云端注册成功。正常安装使用已经打包的官方 SDK，不需安装部署工具。

CloudBase 部署、账号配置和真实验收见 [cloud/README](cloud/README.md)。2026-10-13 用户认证、桌面调用和完整快照同步通过；手机和网页客户端待后续开发。

## 文档与版本入口

[交接](SESSION_HANDOFF.md) · [工作日志](WORKLOG.md) · [开发约定](AGENTS.md) · [正式方案 v1.17](最终方案.md) · [视觉与动效规范](视觉与动效规范.md) · [徽章清单](徽章设计清单.md) · [版本管理规范](版本管理规范.md) · [VERSION](VERSION) · [CHANGELOG](CHANGELOG.md)。旧规划／候选仅保留历史。

当前版本为 `0.1.0-alpha.17`，主分支 `main`，既有规划与预览附注标签保持。2026-10-14 用户授权接入 [GitHub 私有仓库 StuTuse/rater-tracker](https://github.com/StuTuse/rater-tracker)，`origin` 为 `https://github.com/StuTuse/rater-tracker.git`；访问需要获授权的 GitHub 账号。源码、文档、锁文件与素材入库，安装包、个人数据、备份、私有配置及签名材料不入库。

用户已同意单仓库双应用工程、共享规则与独立 Git worktree 方案，见 [双端工程与工作区隔离方案](docs/双端工程与工作区隔离草案.md)。当前可运行工程仍为 Windows；两个 worktree 与 Windows 开发数据隔离已建立，见 [隔离登记](docs/工作区隔离登记.md)；安卓工程正在独立工作区移植与验收，尚未完成。Windows 工作区使用 npm run start:dev 进入独立开发数据目录。

规划模拟仍在 `analysis/`，不能替代应用业务测试；没有重新运行或覆盖历史模拟结果。

生图素材与完整提示词：[清单](docs/生图素材清单.md) · [可离线打开的徽章总览](assets/generated/gallery.html) · [alpha.2 验收](docs/alpha.2验收记录.md)。素材使用内置 image_gen 制作，全部最终图片已保存入项目。

alpha.3 经验条历史动效预览：[实际录制](output/playwright/alpha3-xp-flow.mp4)；完整动效可在设置中切换为柔和或关闭，系统减少动态优先。录制是本地忽略产物，重新检出源码时不包含该视频。
