# 双端移植交接 · 2026-10-14

GitHub已为PRIVATE：https://github.com/StuTuse/rater-tracker；保留完整历史与18个旧标签。Android完整邮箱验收尚未完成，不得宣称全部完成或创建完成标签。

工作区：主目录D:/Project/AgentPAGE/Codex Project/Rater&Tracker为main集成；Android C:/Users/15817/.codex/worktrees/android-port/Rater&Tracker（codex/android-port）；Windows C:/Users/15817/.codex/worktrees/windows-dev/Rater&Tracker（codex/windows-dev）。本聊天统一负责共享模块／双端集成，不派遣其他会话。Windows隔离80d67b8已集入安卓分支。各自依赖／运行数据／构建输出独立，Windows开发用npm run start:dev，数据runtime-data/windows-dev，正式%APPDATA%/RaterTracker不用于验收。

apps/windows是实际Electron入口；apps/android是Capacitor8.5.3原生工程；packages/core、data、ui共享，旧src／electron路径兼容。Windows版本alpha.17（根VERSION及package／lock、apps/windows/VERSION）；Androidalpha.1、VERSION_CODE=1。规则1.3／JSON格式1、48徽章／51PNG／十阶段／92语录不变；金额microXP、冻结C/F／正常额度痕迹／导入不发奖不可改回按当前任务重算。

实际构建：node scripts/android-build.mjs；JDK21（本机Android工作区runtime-data/toolchains/jdk-21.0.12.1+1），SDK C:/Users/15817/AppData/Local/Android/Sdk。RATER_JAVA_HOME可指定Java21；RATER_BUILD_PROXY只在本次下载需要时设为本机现有代理。Gradle8.14.3／AGP8.13.0／compile,target36／min24。Android Studio自带JBR25不适合此Gradle，工程忽略的本地配置已指Java21。签名已保存主目录runtime-data/android-signing，构建自动通过Git common dir使用它；RATER_ANDROID_SIGNING_DIR可指定既有私有目录。保留原密钥才能更新，不入库，不归档仍需使用的忽略文件。正式ID local.ratertracker.android，dev后缀.dev；本次测试emulator-5556，独立数据镜像runtime-data/emulator，不改原AVD快照。

已通过47业务／工程；真实WebView105条件（12UI、26控件、41切页、11flow、9阶段、6MAX），头像改动后控件26复验；10真实返回／后台／键盘／草稿，8真实文件读写／取消／UTF8错误保持数据；真实账号12与原生云协议6；签名正式包8真实UI条件（登录、冷启、覆盖、退出、四页）通过；另有今日评分保存、正式包与Windows双向互导199.902727XP／0星／冻结参数保持。Windows源码和最新unpacked实际smoke通过packaged=true。详见docs/Android验收记录.md与WORKLOG W033～W035，失败与修复有记录，帧率／真机／其他安卓版本／长期大数据／完整辅助功能未验证，NSIS升级未重跑。

Native认证完整SDK缓存仅进程内存并由Keystore AES-GCM／AtomicFile保存，SDK令牌自动刷新加密；userinfo缺失仅按同一subject恢复已验证身份；同步绑定UI账号作用域；断网退出失败恢复缓存，未登录可幂等退出。注册挑战10分钟，仅内存；取消／超期／重复不登录。原生inactive／active暂停动画与轮询，不能仅依赖Android WebView的document.hidden；头像随页头滚动，原生系统栏／键盘适配，SAF后台IO且严格UTF8。

待办首要：QQ邮箱窗口可只读，但两次激活失败（failed to activate captured window），按工具恢复规则停止输入；用户已被请求刷新，未回复。首次注册验证码已超过10分钟且旧挑战因重建失效，需要最后重新发码；用户指定邮箱保存在忽略runtime-data/android-test/registration.json，不写入源码。通过电脑操作skill的Sky读取最新CloudBase邮件，可由用户手动刷新／提供新码。只验证身份和持久恢复，若邮箱对应已有账号，不灌测试记录／不改其云数据。尚无真实邮箱验证成功证据。

验证码阶段之后：更新实际验收与日志／交接、核对并集入main、Windows工作区合并共享基线、保持私有并推送，完成时才建Android附注标签。当前源码检查点提交可上传为WIP，不能把上传／实现等同全验收。最终APK在Android工作区release/android，签名已验证v2、RSA3072；最终校验／主目录稳定产物复制仍需补录。

验收命令：node scripts/check.mjs；node scripts/android-ui-acceptance.mjs ui|controls|pages|flow|stages|max；android-mobility-acceptance.mjs／android-files-acceptance.mjs；RATER_ANDROID_TEST_CREDENTIALS指向忽略JSON（username,password,id），运行android-account-acceptance.mjs／android-cloud-acceptance.mjs／android-release-acceptance.mjs。仅本次虚构云账号作写测试，原业务快照恢复，云版本正常增长。报告与截图output/android、output/desktop忽略。下一会话先看最新WORKLOG和本文件，不能输出密码／验证码／JWT／QQ邮件会话URL。


最新W037：main及Windows工作区已快进至eb83ea2，私有main／codex/android-port已推送，47检查通过。最新debug包已安装、账号12补查通过；正式包8通过并已回读签名，稳定APK在主目录release/android，98,107,848字节，SHA256见W037。本次新邮箱验证码已重发，验证页保持，用户未回复刷新／新码，不能reload或重装dev以免挑战失效。用户回复后直接只读Sky邮箱取最新码，或用其提供新码完成验证；超过10分钟重新发一次。还未创建Android完成标签。
