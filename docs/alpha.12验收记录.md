# alpha.12 · 启动短句与获得勋章

日期：2026-10-13，香港时间。应用0.1.0-alpha.12、产品v1.14、视觉v1.10，结算1.3／格式1保持。

## 实际实现

顶部Rater & Tracker右侧36句平淡提醒／自问，只围绕剪辑、写稿、锻炼、睡觉、学习、交新朋友。启动排除上次句子，本次运行保持，不加侧栏口号；上次句子保存在本机界面localStorage，不写业务状态或备份。

实际保存新增有效勋章后，使用账号中心同款420px暖白金边居中窗口，中央已有生图原图与名称；多枚合并前后查看，收下或关闭返回。36片有限金色礼花、图标渐显与细金环；柔和／关闭／系统减少动态无礼花。等待已有弹窗与输入结束，不覆盖草稿；待显示／正在显示的无效勋章随更正取消。提示不参与结算，恢复、账号切换、同步下载、冲突重载清队列，不重演已有徽章。

## 实际检查

- `npm run check`40/40：25业务、6同步／清空、5注册、2阶段、2提示；语法／版本／51素材通过。提示测试覆盖所有上一句与随机边界、待显示／可见徽章撤回、批次去重和清空。
- `scripts/notices-acceptance.cjs`21/21：启动换句、运行保持、仅顶部；核心真实评分事务构造99星，再点击保存5星达到100，同时得到初见星光与翻开一页，名称／图像／两枚切换、36片有限礼花、无额外XP、居中同款样式、390px无溢出、关闭尺寸冻结通过。
- 原有窗口与用户名草稿保持；延后期间撤回不弹、可见撤回自动关闭、填写备注不被打断、保存失败不弹、同值保存不重复、柔和／关闭／减少动态安静、重启不重演均通过。延后／撤回压力场景以DOM事件触发背景评分；普通获得与窗口操作用真实浏览器鼠标／键盘。finally恢复隔离快照。
- 既有flow11/11：接续、最终值／宽度、可读性、减少动态、隐藏暂停、关闭、0值与125%控件通过。
- 源码及最终打包Electron：真实评分保存后的两枚勋章窗口／生图加载、36片有限礼花、实际经验等于核心事务预期、短句在顶部标题右边均通过；既有账号变形／草稿／关闭／秘密清理、十阶段、资源和保存条件保持通过。仅smoke模式构造暂时近门槛快照，finally恢复原隔离数据。
- NSIS alpha.11→alpha.12隔离安装升级：快捷方式、单实例、11XP／revision1／数据路径保持；已卸载隔离副本。正常用户数据与云端账号未操作。
- 查看桌面勋章截图和浏览器1440×960／390×844截图，初稿前后按钮箭头为上下方向，改为左右方向后重新构建并复查。截图与报告在忽略的output目录。

## 实际命令与产物

```powershell
npm run check
node node_modules/@playwright/cli/playwright-cli.js -s=notices open http://127.0.0.1:4173
node node_modules/@playwright/cli/playwright-cli.js -s=notices run-code --filename=scripts/notices-acceptance.cjs
node node_modules/@playwright/cli/playwright-cli.js -s=notices run-code --filename=scripts/flow-acceptance.cjs
node node_modules/electron-builder/cli.js --win nsis --x64 --publish never --config.electronDist=node_modules/electron/dist
node scripts/desktop-smoke.mjs 'release/win-unpacked/Rater & Tracker.exe'
& .\scripts\install-acceptance.ps1 -PreviousInstaller 'release/Rater-Tracker-0.1.0-alpha.11-Setup.exe'
```

预览先启动npm run dev。最终安装包 `release/Rater-Tracker-0.1.0-alpha.12-Setup.exe`，203,244,175字节，未签名；SHA256 `82AF7659BDFB1FF3E5B6F28A43A0EF052EAF193A42BC1065BC51F7880EAAE3BF`。

本轮未改core、storage、云端SDK／SQL／认证配置和生图资产；不声称新增云端认证实测、真实邮箱注册完成或60fps／GPU检查。原生文件对话框、长数据与完整人工连续体验仍待后续。句子只要求避免相邻启动重复，不承诺整池36次循环不重复；本机界面偏好无法保存时不能跨启动排除上一句。
