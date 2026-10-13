# alpha.16 · 白底启动页

2026-10-14，香港时间（10月13日开始，跨午夜完成）。应用alpha.16／产品v1.18／视觉v1.14，规则1.3／格式1保持。

## 实现与检查

同一应用窗口首屏纯白，中央现有软件图标、下方居中Rater & Tracker，底部TuseCreation为850字重的字标。静态HTML首屏在本机读取前即可展示，主界面隐藏且inert；约1.2秒最短展示与真实准备并行。完整320ms纯透明度消散与主页面入场同时开始，没有整体缩放；柔和／系统减少动态150ms，关闭静态。移除启动层后恢复输入，错误路径也正常显示原错误和重新打开。普通保存、页内切换及raterReload不重播。

- 最终npm run check：40/40，版本／语法／51独立生图资源通过，业务与存储代码未改。
- scripts/startup-acceptance.cjs：18/18。真实浏览器验证白底全屏、图标／名称居中、粗体字标位于下方、无额外文案、输入阻隔与无溢出；完整模式实际中间帧opacity、无缩放、主页面入场衔接、就绪后解锁通过。1440×960与390×844截图已查看。
- 柔和／关闭／系统减少动态、页内切换与重载不重播通过；实际延迟storage.js加载2.1秒时启动页保持，注入一次IDBFactory.open读取失败后正常显示错误／重试，点击重新打开恢复。评分／任务／账本保持，finally恢复隔离浏览器快照。
- scripts/pages-acceptance.cjs：41/41既有回归通过，包括全部五页文字／图像／控件入场、48徽章、四设置面板、页内切换、保存不重播、快速取消、三种动效偏好与390px布局。
- 源码Electron及最终alpha.16 EXE隔离smoke通过。新增startupWhite／startupIdentity／startupCreator／startupBlocksInput／startupDismissed五个实际条件；既有保存11XP／revision1、备份／冲突、资源51／48、十阶段、五页、控件、账号草稿与关闭、勋章原图／礼花／无额外XP均通过。最终report的packaged=true，来源app://rater，使用runtime-data/desktop-smoke。已查看最终EXE startup.png。

## 首轮失败与修正

延迟模块加载专项最初只等待window.raterReady的值，模块未执行时为undefined，提前结束等待并撤销路由，产生Route is already handled。验收改为先等就绪Promise存在，再等待完成，finally等待已有路由处理结束；18项通过。该问题属于验收等待，非应用读取失败处理。

最终包首次两次首屏捕获返回UnknownVizError；源码对照可成功，但说明首帧捕获存在时序不稳定。smoke现等待ready-to-show首绘事件及150ms提交缓冲后再capturePage；源码与重新构建的最终包均通过。该等待仅用于验收捕获，不延长正常用户启动。最终检查没有继续依赖旧包或旧截图。

## 命令与产物

```powershell
npm run check
npm run dev
node node_modules/@playwright/cli/playwright-cli.js --session startup open http://127.0.0.1:4173
node node_modules/@playwright/cli/playwright-cli.js --session startup run-code --filename scripts/startup-acceptance.cjs
node node_modules/@playwright/cli/playwright-cli.js --session startup run-code --filename scripts/pages-acceptance.cjs
npm run desktop:smoke
node node_modules/electron-builder/cli.js --win nsis --x64 --publish never --config.electronDist=node_modules/electron/dist
node scripts/desktop-smoke.mjs 'release/win-unpacked/Rater & Tracker.exe'
```

安装包release/Rater-Tracker-0.1.0-alpha.16-Setup.exe，203,249,343字节，未签名；SHA256 `B0D83395CC758428E88CC993977DBD7F94F26B80863307F868035E6E7623BE25`。未重测NSIS安装升级，最近仍alpha.11→alpha.12。

仅启动页、入口与界面衔接、验收及版本文档；未改业务／存储／账号云端、92句池或生图素材，正常个人数据和云端未操作。截图是实际浏览器／EXE首屏，中间动画帧为受控时间；不声称GPU帧率、低配置长时间体验或完整辅助功能验收。专用startup浏览器和本轮4173服务已关闭，输出／运行数据／安装包不入库。
