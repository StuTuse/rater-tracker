# Android alpha.2 按压反馈验收

2026-10-14。用户要求安卓按下时使用桌面组件悬浮效果，移除原生蓝色方框。Android独立版本0.1.0-alpha.2／VERSION_CODE=2；Windows仍alpha.17，产品v1.22／视觉v1.18，结算1.3／JSON1。

## 实现与范围

apps/android/mobile.css全节点关闭WebView蓝色tap overlay；按钮、评分／任务卡、星级、导航／筛选、徽章、账号、日期／菜单沿用桌面计算样式的暖色、金色描边、阴影与微位移。安卓圆形头像保留既有静止阴影。操作控件标签不允许长按文字选择；输入和正文选择保留。柔和／关闭／系统减少动态取消位移与缩放，保留颜色反馈和金色焦点。

touch-feedback.js通过被动捕获指针事件给目标及父卡临时标记；松手、取消、超过8px移动、滚动、失焦、隐藏及rater-pause清理。不阻止默认动作、不捕获指针、不修改焦点、不参与保存或奖励。共享样式只增加零特异性Android排除条件，抑制原生hover／active残留；移除这些条件后与上一提交的桌面样式逐字一致。

## 实际检查

- node scripts/check.mjs：47工程／业务、语法、版本与51素材检查通过；安卓bootstrap／touch-feedback单独node --check通过。
- node scripts/android-press-acceptance.mjs：隔离模拟器真实原生DOWN／UP／CANCEL，24类控件对照真实Chromium鼠标悬浮；每类颜色／描边／阴影／位移／子图像一致、取消恢复、松手恢复、透明tap overlay，另含禁用、滑动、后台清理事件、柔和、关闭、系统减少动态。比较在实际触摸后落定有限CSS过渡，属于端点与清理验收，不是实时FPS测量；后台清理专项派发真实应用使用的事件，不当成原生后台实测。
- 最终开发APK的原位UI12／控件26全部通过。初轮控件modalExit断言过早读取，观察窗口从5帧扩至12帧并等待实际opacity中间帧后26项全通过；产品弹窗逻辑未改。
- node scripts/desktop-smoke.mjs：真实Electron源码窗口、隔离runtime-data/desktop-smoke，启动、保存、控件、五页、十阶段、徽章等已有条件通过，packaged=false。不声称本轮重新验收Windows安装程序。
- node scripts/android-release-press-acceptance.mjs：正式签名包alpha.1→alpha.2覆盖，已显示评分／XP保持；真实0星按钮DOWN／CANCEL没有保存评分；任务、历史、奖励、设置正常进入，共6条件。真实正式包按住与恢复截图已查看，金色评分卡描边，无蓝色方框。

环境沿用专用emulator-5556、Android17/API37 GooglePlay x86_64、WebView145、1080×2400／420dpi，数据镜像位于既有Android工作区runtime-data/emulator，不写用户原AVD快照。正式包复验仅导航、读回与取消按压，不灌入业务测试记录；未重新做登录／注册／云写入、SAF或完整成长专项。

## 发现与修正

初次沙箱离线npm缓存缺包，使用本机锁定缓存npm ci --offline成功。首次构建前依赖未就绪且日志目录缺失，准备完成后构建通过。最初通用悬浮选择器替换误伤hover媒体查询，真实桌面对照发现并修正；之后验证桌面样式除Android条件外逐字保持。

CDP触控未可靠采到Android活动态，改用原生输入；系统长按约500ms会发pointercancel。非按钮卡原生:active可能松手后残留，改为独立标记并通过取消／松手复验。比较将等价scale=none与1归一化，圆形头像保留原有阴影。首轮长按截图带文字选择菜单，操作标签禁用选择后检查最终正式包画面。注释修改的一次首行替换命令被自动审查拒绝，随后用精确上下文补丁完成；无阻塞遗留。

## 产物与边界

release/android/Rater-Tracker-Android-0.1.0-alpha.2-release.apk：98,111,149字节；SHA256 74CC4B5D0D8E87249900A91A8F78527DDA28DD877A1B720DCCB9200C25725711。v2签名验证通过，原证书SHA256 648b3a169d4b63da50312f44fc09241e8e796a39b781baa60e48a42719c60448；同目录SHA256.txt、Android-Press-Held.png、Android-Press-Restored.png。产物／截图／数据／依赖／签名均忽略。

未验证实体手机、其他Android／厂商系统、FPS、长数据与完整辅助功能。真实按压、窗口和签名包验收不扩写为这些范围。新增命令已同步README；旧里程碑和签名保持。
