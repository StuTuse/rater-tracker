# 双端移植交接 · 2026-10-14

用户授权的GitHub私有上传、工作区隔离、Android移植、真实邮箱注册与后续手机排版已完成列明模拟器场景验收。GitHub https://github.com/StuTuse/rater-tracker 回读PRIVATE。不要将模拟器验收扩大为真机／所有系统或性能承诺。历史过程与失败见WORKLOG W033～W041，最终范围见docs/Android验收记录.md。

工作区：主目录 D:/Project/AgentPAGE/Codex Project/Rater&Tracker 为main集成；Android C:/Users/15817/.codex/worktrees/android-port/Rater&Tracker，codex/android-port；Windows C:/Users/15817/.codex/worktrees/windows-dev/Rater&Tracker，codex/windows-dev。本聊天统一负责共享模块及集成，不派遣其他会话。三个工作区独立依赖、暂存与运行数据，不在别人目录切分支／覆盖改动。Windows开发 npm run start:dev 的数据在本工作区runtime-data/windows-dev，正式%APPDATA%/RaterTracker未用于验收。

apps/windows为实际Electron入口，apps/android为Capacitor原生工程；packages/core、data、ui共享，旧src／electron保留兼容。规则1.3、JSON格式1、48徽章／51PNG／十阶段／92语录保持。Windows alpha.17由根VERSION/package及apps/windows维护；Androidalpha.1、VERSION_CODE=1独立；产品v1.21／视觉v1.17。后续安卓覆盖更新必须递增VERSION_CODE并沿用签名，Android附注标签android/v<版本>，18个旧标签不动。

构建 node scripts/android-build.mjs；同步 node scripts/android-command.mjs sync android；Android Studio node scripts/android-command.mjs open android。JDK21路径Android工作区runtime-data/toolchains/jdk-21.0.12.1+1，可用RATER_JAVA_HOME；SDK C:/Users/15817/AppData/Local/Android/Sdk。Capacitor8.5.3、Gradle8.14.3、AGP8.13.0，compile/target36、min24；Studio的JBR25不适用。签名主目录runtime-data/android-signing，脚本通过git common dir定位；RATER_ANDROID_SIGNING_DIR可指定既有私有目录。保留密钥/config，绝不入库、不打印。工作区工具链、模拟器、签名为忽略文件，未经保全不要归档工作区。

最终正式包在主目录release/android/Rater-Tracker-Android-0.1.0-alpha.1-release.apk，98,109,524字节，SHA256 825460cd1bf81027a5c167f245f7455f90fbb80e3be8b8fdb763d6b8b5d464a0，附SHA256.txt及Android-Today／Rewards／Landscape.png。签名v2、RSA3072，证书SHA256 648b3a169d4b63da50312f44fc09241e8e796a39b781baa60e48a42719c60448。正式ID local.ratertracker.android，dev为后缀.dev，存储分离。实际测试为隔离emulator-5556，Android17/API37 GooglePlay x86_64，WebView145，1080×2400／420dpi；独立数据镜像runtime-data/emulator，不写原AVD快照。

已通过47工程／业务；真实WebView105（UI12、控件26、切页41、flow11、阶段9、MAX6）；原生返回／后台／键盘／草稿10、真实SAF8、真实虚构账号12与Native云协议6、正式签名UI8、真实邮箱注册5。Windows源码与unpacked EXE smoke通过packaged=true；双向JSON互导199.902727XP／0星／冻结参数与账本保持。邮箱验收仅身份与恢复，未灌业务测试记录，已退出。凭证保留忽略runtime-data/android-test/registration.json，不输出邮箱／密码／OTP／JWT。

用户要求先完成功能验收，再优化手机排版，已按此顺序执行。仅apps/android/mobile.css调整页头分层、紧凑成长／评分卡、整行日期、横向筛选、横向系数卡、纵向备份、五等分导航、44px点击和弹窗滚动、横屏紧凑布局；Windows样式未改。最终复验控件26／切页41／原生操作10／文件8／正式包8，280／320／411px竖屏和914×411横屏共20页边界通过，实际截图已查看。首轮正式登录失败且旧脚本用户名断言过宽，已修正为账号中心非编辑身份＋退出按钮，增加输入焦点等待／清空；真实复验全通过。详情W041。

Native认证完整SDK缓存仅进程内存并由Keystore AES-GCM／AtomicFile保存；恢复按同一已验证subject，刷新随会话加密，同步绑定UI账号作用域；退出失败恢复缓存。注册10分钟挑战仅内存，取消／过期／重复不登录。原生inactive／active暂停成长和轮询，不能仅依赖Android后台仍false的document.hidden；SAF后台IO严格UTF8。历史冻结奖励不能按当前任务重算，导入不发奖。

验收命令 node scripts/check.mjs；node scripts/android-ui-acceptance.mjs ui|controls|pages|flow|stages|max；android-mobility-acceptance.mjs、android-files-acceptance.mjs。账号／云／正式包分别android-account-acceptance.mjs、android-cloud-acceptance.mjs、android-release-acceptance.mjs，RATER_ANDROID_TEST_CREDENTIALS指向忽略的username/password/id虚构账号JSON。只在隔离测试设备运行；不使用用户真实账号灌入测试数据。报告与截图output/android、output/desktop忽略。原虚构云业务快照已恢复，版本正常递增；正式包虚构账号本地可保留既有冲突，最后退出访客，不替用户清空数据。

未覆盖：实体手机、其他Android版本／厂商系统、长期大数据、帧率及完整辅助功能，Windows NSIS安装升级未重跑。没有待取验证码。后续使用／发布手机新包前按实际设备继续验证。最终源码提交6e6e2e7已快进同步三工作区；main、codex/android-port、codex/windows-dev均已推送PRIVATE。附注标签android/v0.1.0-alpha.1指向6e6e2e7并已推送。集成后main和Windows工作区47检查各通过。当前没有待完成的已授权移植或排版事项。
