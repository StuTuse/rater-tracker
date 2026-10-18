> 历史记录：用户于2026-10-19明确放弃本次1.0.1实现，其发布草稿已删除。本文仅保留历史证据；重建1.0的检查见[重建记录](1.0重建记录.md)。

# 1.0.1 UI对齐与动效验收

日期：2026-10-19。双端1.0.1，Android code8；仅界面、反馈与键盘可视区域调整。规则1.3／JSON1、经验、原签名保持。

## 实际变化

- 统一卡片名称、右侧写字／操作、页头日期与章节基线；消除手机账号与标题重叠、写字挤压、700px卡片星级溢出。主要评分／写字控件44px。
- 平板侧栏＋评分与任务并排，宽度不够时评分单列；手机首项任务＋查看全部，空任务区后置；四项评分记录、历史原因和长原文自然延长。
- 记录展开收起260ms高度过渡；任务新增／重排衔接；历史切日／月、周报归档／原文局部280ms反馈；柔和130～140ms无内容位移、关闭静态，离开后台取消有限动画。
- 日期回看不清空图表SVG；长记录在其他保存时保留输入节点、光标和高度；Android软键盘变化后当前字段移入可见区域。

## 检查与证据

| 检查 | 结果与范围 |
| --- | --- |
| 单元／工程 | npm test 69/69；npm run check 56/56，新增双端VERSION／package／Android lock一致性 |
| 隔离Chrome | scripts/ui-polish-acceptance.cjs，46项通过；320/360/390/700/800/1024/1280/1440两种CSS级联，共16组尺寸，无横向溢出、控件44px、章节对齐 |
| 实际操作 | 写字聚焦／展开、长文保存、输入节点与高度、精简推进与保存、图表节点不替换、切月、周报原文不跳屏、关闭／系统减少动态 |
| 最终Windows | 普通临时目录同ASAR打包副本，scripts/desktop-polish-smoke.mjs，14项通过；1426×924逻辑视口。未进行安装或升级 |
| 最终Android APK | Android37隔离RaterSigningAcceptance，正式包覆盖安装成功；scripts/android-polish-smoke.mjs的7项原生操作通过。可见系统键盘、字段聚焦、自动保存、历史、周报；无真实登录 |
| 包内源核对 | Windows ASAR6个共享UI文件、Android ZIP7个共享／入口文件均与工作区逐字节一致 |

截图和报告位于本地忽略的output/playwright/polish-*、output/desktop/ui-polish、output/android/polish-release-*；已目视桌面首页／短窗、手机／平板、历史／周报和Android系统键盘。浏览器安卓CSS模拟不等于实体设备或原生运行。

## 构建与产物

标准Windows下载Electron超时，使用现存44.7.0的electronDist；NSIS临时使用内置UninstallerReader，finally恢复依赖SHA。默认工作目录EXE退出0x80000003，完整复制普通临时目录后ASAR相同、运行通过。Android采用既有原证书v1/v2/v3；正式APK不开放WebView调试，原生UIAutomator检查，隔离debug变体只用于键盘几何诊断。

| 产物 | 字节 | SHA-256 |
| --- | ---: | --- |
| Rater-Tracker-1.0.1-Setup.exe | 203330579 | 4b6c058f222983ad13f5c99a25d5f61e08ec3a425cb3365eb429d46f46da9304 |
| Rater-Tracker-Android-1.0.1-release.apk | 98217834 | 9bb8c185bd3c1d6bf6cf6ff25d284af2feca11d37b96793767e57cea54510997 |

双端安装包与统一校验清单：[本批次Release](https://github.com/StuTuse/rater-tracker/releases/tag/dual%2F2026.10.19.1)。Windows未签名。

## 未覆盖

实体手机／平板帧率、长时间GPU表现、真实中文IME完整组合输入、真实账号云服务、通知后台送达、Windows覆盖安装升级与全面辅助功能均未执行。本次测试不证明这些事项通过。
