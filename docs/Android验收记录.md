# Android alpha.1 验收记录（进行中）

2026-10-14。可安装的本地资源 APK 已构建，真实邮箱验证码验证尚未完成，不能标为完整验收完成。

实际环境：Windows11、Android Studio SDK、JDK21.0.12.1、Capacitor8.5.3、AGP8.13.0、Gradle8.14.3；compile/target36、min24。隔离 Android17/API37 Google Play x86_64 模拟器 emulator-5556、WebView145，默认1080×2400／420dpi，真实280／390px尺寸检查。此记录不声称所有安卓版本、真机或帧率已验收。

已通过：47工程／业务检查；真实WebView UI12、控件26、切页41、经验接续11、十阶段9、MAX6，共105条件。业务状态由真实事务生成，不能把临时画廊或中间帧当成产品功能／实时FPS。

账号：真实虚构账号登录、加密凭证、无网页明文JWT、重载／冷启动／离线身份、离线保存、令牌刷新、重连、退出清除通过。断网退出与账号作用域最终增补正在回归。云原生上传、重复重试、过期版本冲突、回读一致、恢复原测试云快照通过；恢复保留原业务内容，云版本正常递增。

备份：原生SAF虚构JSON导出／导入／取消已实际操作；正式签名包导出11XP，恢复Windows实际保存的199.902727XP备份，再导出并在真实Windows应用反向恢复，账本、冻结参数、0星一致。恢复前取消当前备份保持最新197.902727XP。新后台IO／严格UTF8校验与正式包最终回归仍待补录。

Windows：拆分入口的真实源码及unpacked EXE smoke通过，packaged=true；11XP保存／恢复、51素材／48徽章、五页、账号框、成长与启动页检查通过。本轮不表示重新做了NSIS安装升级。

发现并处理：SDK persistence=none仍默认写浏览器存储，改为完整SimpleStorage内存适配；setSession不总返回用户资料，按已验证subject恢复身份；仅存两枚令牌不足以恢复RDB访问，完整SDK缓存加密保存；自动刷新同步加密；断网后模拟器Wi-Fi需恢复原AndroidWifi。旧切页与阶段中间帧检查遇到模拟器时序漏帧，改为实际动画暂停中间帧／恢复，清理临时画廊并恢复实际尺寸。MAX脚本补上现行勋章“收下”操作。均不以首轮失败当通过。

命令：node scripts/check.mjs；node scripts/android-build.mjs；node scripts/android-ui-acceptance.mjs ui|controls|pages|flow|stages|max；设置RATER_ANDROID_TEST_CREDENTIALS为忽略的虚构账号JSON（含username/password/id），运行node scripts/android-account-acceptance.mjs和node scripts/android-cloud-acceptance.mjs。真实原生控件工具scripts/android-native-ui.mjs。

报告／截图在output/android、output/desktop，均忽略。测试只操作隔离模拟器、隔离Windows数据和指定虚构云账号。签名密钥已同内容备份到主工作区runtime-data/android-signing，不入库；构建自动使用主工作区签名，RATER_ANDROID_SIGNING_DIR可指定既有私有目录。

待完成：正式APK最新回归、真实新邮箱验证、Git集成和最终私有上传。长期数据／GPU性能、完整辅助功能及其他系统／真机仍未验证。
