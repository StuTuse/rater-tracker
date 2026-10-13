# alpha.17 · 淡黄色启动页

2026-10-14，香港时间。应用alpha.17／产品v1.19／视觉v1.15。

按用户要求将纯白改为软件背景同款淡黄色#faf8ef：启动层与body复用--paper，Electron窗口首帧同步颜色；图标、名称、TuseCreation粗体字标和现有过渡保持。浏览器／桌面验收不再检查纯白，而检查实际rgb(250,248,239)与页面底色相同。

实际npm run check40/40，版本／语法／51素材通过；既有scripts/startup-acceptance.cjs18/18，包含宽窄屏、实际配色、布局、消散、偏好、读取失败重试和数据保持。最终alpha.17 EXE隔离smoke通过，startupBackgroundMatches／标识／粗体字标／输入阻隔／就绪退出及既有条件全部通过，报告packaged=true、来源app://rater、11XP／revision1。已查看浏览器与最终EXE首屏截图，专用startup-color浏览器及本轮4173服务已关闭。

```powershell
npm run check
# 先npm run dev，在专用浏览器打开本地来源
node node_modules/@playwright/cli/playwright-cli.js --session startup-color run-code --filename scripts/startup-acceptance.cjs
node node_modules/electron-builder/cli.js --win nsis --x64 --publish never --config.electronDist=node_modules/electron/dist
node scripts/desktop-smoke.mjs 'release/win-unpacked/Rater & Tracker.exe'
```

安装包release/Rater-Tracker-0.1.0-alpha.17-Setup.exe，203,249,318字节，未签名；SHA256 `7BAD8D524600EE15B4495142601A7D94A9A9E66C3C02860D8364FFA27AE24140`。没有新增验收脚本或业务测试；既有启动脚本仅更新颜色条件。本轮未重跑41项全页面专项／NSIS安装升级／云端认证，最近升级实测仍alpha.11→alpha.12；不声称GPU帧率或完整人工体验。未改业务／存储、账号云端或素材，不操作个人数据。
