# alpha.2 生图素材更新验收记录

日期：2026-10-12，香港时间。版本：**0.1.0-alpha.2**。产品依据：《最终方案》v1.4、《视觉与动效规范》v1.2、48 枚徽章清单；结算规则仍为 1.3，备份格式仍为 1。

## 产物

- 安装包：`release/Rater-Tracker-0.1.0-alpha.2-Setup.exe`，Windows x64 NSIS。
- 大小：202,683,627 字节，约 193.3 MiB。保留全部生图原图，安装包较 alpha.1 增大。
- SHA256：`5A1DF5DFDB31F1CA3CC96B9F74F6A1F037C608D6F7C89006F82C3CCEB16B24E0`。
- Authenticode：`NotSigned`；可运行目录 `release/win-unpacked`。
- 源码与原图以本地附注标签 `v0.1.0-alpha.2` 定位；未配置远程。安装包、运行数据、报告和截图不入库。

## 本次实施

内置 image_gen 分别生成背景 1 张、透明空状态插画 2 张、透明徽章 48 张，所有最终原图、完整提示词及离线总览保存入项目，见 [素材清单](生图素材清单.md)。界面底纹降低对比，任务和明细空状态使用插画，徽章列表与详情引用新 PNG。获得提示仍由真实有效状态驱动，旧 SVG 留作参考。

素材详情验收发现原有点击处理中的变量遮蔽：查找徽章时将按钮变量与回调参数同名，读取了不存在的 dataset，导致详情无法打开。已修正，并验证详情打开、图片解码与关闭。业务核心、存储格式、冻结参数和用户数据路径没有调整。

## 工程与实际浏览器

- `npm run dist` 成功；其前置 `npm run check` 验证版本／语法、48 个旧参考图、51 张不同 PNG、尺寸不低于 512、50 张透明素材的 RGBA 格式，**25/25 业务测试通过**。
- `scripts/browser-acceptance.cjs` 在本轮新素材接入后复验，**12 项条件通过**：保存失败／重试、快速更正、最终动画数值、旧 revision 拒绝、备份往返、48 枚资源、历史显示、动效偏好及 800／390px 布局。
- `scripts/art-acceptance.cjs` 实际 Chromium 检查：48 枚总览、不同资源地址、真实透明背景、总览无横向溢出、51 张解码、两张插画透明、详情读取新 PNG。全部通过；总览与详情截图在 `output/playwright/generated-gallery.png`、`generated-detail.png`。
- 人工查看全部徽章主体与原清单对应、今日背景和空状态、徽章详情以及实际安装窗口。小尺寸卡片没有白色矩形背景，图像轮廓与留白完整。

透明背景检查读取实际 canvas alpha，不只检查文件扩展名。要求至少 5% 的像素完全透明，四角透明度不超过 1/255。初次严格要求四角完全为零，学习系列第 5 枚左上角一个 1/255 像素使检查失败；该图实际 46.38% 像素完全透明。放宽不可见边角噪点并保留透明面积条件后通过，未改动原图。

本轮未重跑 alpha.1 的 5 项 MAX 检查，相关业务／成长代码未改变；历史结果见 [0.1 验收记录](0.1验收记录.md)。这些历史结果不作为本轮新增检查。

## 桌面与真实跨版本安装

`node scripts/desktop-smoke.mjs 'release/win-unpacked/Rater & Tracker.exe'` 成功。实际 `app://rater` 下 51/51 图片解码、48 枚徽章加载、Node 隔离、11,000,000 micro-XP 保存、完整备份校验与 stale revision 拒绝通过。当前版本报告为 alpha.2。

执行：

```powershell
& .\scripts\install-acceptance.ps1 -PreviousInstaller 'release/Rater-Tracker-0.1.0-alpha.1-Setup.exe'
```

在工作区隔离安装目录先安装已归档的 alpha.1，再安装 alpha.2；检查安装 EXE、桌面快捷方式目标、单实例及升级后的实际运行。版本确实从 alpha.1 变为 alpha.2，11 XP、revision=1 和 `runtime-data/desktop-smoke` 数据路径保持，报告 `crossVersionUpgrade=true`。新版 51 张图片从安装目录离线加载。结束卸载测试副本，没有操作正常 AppData 数据。

报告：`output/install/report.json`、`output/desktop/report.json`；实际安装版截图：`output/desktop/desktop.png`。只覆盖本次相同数据格式的 alpha.1 → alpha.2 升级，不能推断以后格式迁移已通过。

## 范围与后续

仍是 alpha。尚未覆盖：Windows 原生备份对话框完整点击路径、长期大数据性能、60 fps 实测、安装器全部交互分支与完整人工连续使用验收。底纹已查看实际平铺效果，未进行严格无缝边缘测量；原图与安装体积尚未优化。

本轮复用已经存在的 4173 预览监听，专用 Playwright 浏览器收尾关闭；不擅自终止预先存在的预览服务。生成曾因一次过长 Windows 命令触及命令行长度上限，改用小批复制／文件补丁完成；没有因此遗漏素材。下一步按真实使用反馈打磨可读性、动效和性能。
