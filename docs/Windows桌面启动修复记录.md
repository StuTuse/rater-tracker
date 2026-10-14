# Windows 桌面启动修复 · 2026-10-14

Windows 应用保持 `0.1.0-alpha.17`；Android 保持 `0.1.0-alpha.2`／code 2。本轮只修改 Windows 开发快捷方式的准备脚本与说明，没有改变安装包、应用代码、业务规则或用户数据格式。

## 问题和依据

用户报告双击桌面快捷方式出现 SmartScreen，手动选择“仍要运行”后窗口仍未正常显示。现有 `Rater & Tracker（开发验收）.lnk` 指向项目 `node_modules/electron/dist/electron.exe`，源码入口与工作目录均为本项目。Electron 未签名；该快捷方式和 EXE 均未发现 Zone.Identifier。

原项目运行时启动后退出码为 `2147483651`（`0x80000003`），隔离数据和关闭 GPU 加速均复现。将本机缓存中的同版本 Electron 44.7.0 解压到普通临时目录，同一源码成功显示窗口；17 个顶层运行时文件逐项 SHA-256 与项目副本完全一致。目录环境是已证实的触发差异；目录 ACL 不同，但没有进一步证明是哪条 ACL 触发，不将某个 SID 或显卡认定为根因。

## 修复

`scripts/create-desktop-shortcut.ps1` 把完整运行时复制到普通用户应用目录 `%LOCALAPPDATA%/RaterTrackerDevRuntime/electron-<版本>-<EXE哈希前12位>`，对每个文件校验 SHA-256 后更新原快捷方式。校验相同的副本可复用，重复执行不必覆盖正在使用的相同文件。运行时版本取自项目依赖，不改变锁文件、不下载其他版本。

快捷方式的源码参数、工作目录、图标和正常数据路径保持：`%APPDATA%/RaterTracker`。没有复制、删除、导入或更改个人业务记录，没有修改工作区 ACL、Windows SmartScreen 或应用沙箱设置。

## 实际检查

- PowerShell AST 解析、`git diff --check`、工程 `npm run check` 的 47 项测试通过。
- 运行时全部 73 个文件与项目副本 SHA-256 一致；连续两次执行快捷方式脚本均成功，读回目标与源码参数正确。
- 修复后运行时执行既有真实 Electron 隔离 smoke。首轮只有 `startupBlocksInput=false`，整体 exit 1；其他结构、五页、存储、素材、动效和启动完成条件通过。源码允许消散期显示主界面，因此该项可能受到采样时序影响；未单独捕获该项瞬时状态，复跑全部条件为 true、exit 0。保留两轮报告，不把首轮记作通过。
- 报告和实际截图在忽略目录 `output/desktop/startup-repair`、`output/desktop/startup-repair-repeat`；实际截图已查看。测试数据仅在 `runtime-data/startup-repair-smoke`，正常个人数据未写入测试记录。
- 从修复后的原桌面快捷方式打开正常数据模式，观察到标题 `Rater & Tracker · 留下成长的痕迹`，主窗口和 Electron 子进程持续存在，留给用户继续使用。

原项目 EXE 的立即退出与 SmartScreen 是两项分别观察到的问题。本次修复本机开发快捷方式的启动；未取得受信任代码签名证书，也未验证其他电脑的 SmartScreen 行为。Windows／Android 安装包未变，不重建或重传；本次源码修复按双平台发布规则创建新的源码 prerelease，并链接原包。未重测 NSIS 安装／升级、Android、账号云端写入或其他 Windows 系统。
