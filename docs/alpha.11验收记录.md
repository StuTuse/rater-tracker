# alpha.11 · 十阶段等级视觉验收

日期：2026-10-13，Windows 11 x64。应用0.1.0-alpha.11；产品v1.13、视觉v1.9，结算1.3／格式1保持。

## 已实现

Lv.1～9、10～19，依次至80～89、90～MAX共十阶段。独立SVG主体为新芽、火炬、层叠星、双羽、月桂星、宝石冠、太阳轮、水晶翼、日环晶羽、星翼冠；金色框体与光晕逐步丰富，MAX加入星座环。十种经验条循环与十套图标升级动作，实际保存导致升级才播放，退级更新当前阶段，恢复静态落定。减少动态、柔和、关闭和隐藏暂停沿用既有策略。

## 实际检查

- `npm run check`：38/38（25业务、6同步／清空、5注册、2阶段），版本、语法与51独立生图素材通过。阶段测试覆盖全部99级和MAX、九个真实XP阶段边界及1微单位回退。
- Playwright `stages-acceptance.cjs`：9/9。用核心真实创建／完成事务构成阶段快照，再实际点击学习5星并保存，分别跨越十个目标阶段内的等级边界；十种图标、流动名称、升级WAAPI编排不同，撤回评分回退，MAX仍为阶段十，390px静态布局无横向溢出，柔和／关闭停止新增流动。finally恢复隔离浏览器原快照。总览为临时注入的渲染预览，不是新增用户页面。
- 既有 `flow-acceptance.cjs`：11/11，接续、最终数值、ARIA、可读性、减少动态、隐藏暂停、关闭、零值与125%控件条件通过；既有MAX专项5项通过。
- 最终 `release/win-unpacked/Rater & Tracker.exe --smoke`：打包true、版本alpha.11、51素材／48徽章、11XP、备份与冲突保护、既有菜单／月历／滑块／弹窗条件通过。新增当前阶段匹配、十阶段SVG getBBox与十种computed流动样式通过；等级探针隐藏且不修改实际业务经验。登录框变形、草稿、关闭布局及消散后清密码仍通过。
- 实际NSIS alpha.10→alpha.11隔离升级：快捷方式、单实例、11XP／revision1／数据路径保持，已卸载隔离安装副本。正常用户数据及云端账号未操作。
- 查看十图总览、阶段截图与实际安装桌面截图。输出位于忽略的 `output/playwright`、`output/desktop`、`output/install`。

## 发现与修正

初稿SVG开放路径继承默认黑色填充，月桂出现黑三角；根组显式fill=none后复查正常。首轮整页截图包含上个撤回确认框的消散尾帧，改为等待关闭结束再截经验卡。窄屏图标最小宽度检查曾采样到MAX升级缩小入场帧，静止布局检查改为等待有限动画结束，最终9项全部通过。这不是帧率测量。

`npm run dist`外部下载连接ETIMEDOUT；工程检查已通过，改用本机同版本Electron运行时命令成功生成最终NSIS，再检查最终包及升级：

```powershell
node node_modules/electron-builder/cli.js --win nsis --x64 --publish never --config.electronDist=node_modules/electron/dist
node scripts/desktop-smoke.mjs 'release/win-unpacked/Rater & Tracker.exe'
& .\scripts\install-acceptance.ps1 -PreviousInstaller 'release/Rater-Tracker-0.1.0-alpha.10-Setup.exe'
```

## 产物与边界

- 安装包 `release/Rater-Tracker-0.1.0-alpha.11-Setup.exe`：203,241,874字节，未签名。
- SHA256：`867A0E9341527CB8EE165F6C8DF2325F679E331050E9AE5612D67CA90E114474`。
- 本轮未改结算核心、存储、云端SDK／SQL／身份配置、48枚生图资产。十种实际保存升级在浏览器检查；桌面检查渲染布局与CSS样式，不声称桌面逐阶段鼠标全过程或60fps／GPU性能实测。长期大数据、完整人工连续体验、原生文件对话框及真实邮箱注册仍需后续验收。
