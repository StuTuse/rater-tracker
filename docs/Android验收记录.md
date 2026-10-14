# Android alpha.1 验收记录（模拟器验收通过）

2026-10-14。可安装的签名 APK 已构建；真实邮箱注册及冷启动身份恢复完成，按已列场景的模拟器验收通过，随后完成用户追加的移动排版优化及实际复验。

实际环境：Windows11、Android Studio SDK、JDK21.0.12.1、Capacitor8.5.3、AGP8.13.0、Gradle8.14.3；compile/target36、min24。隔离 Android17/API37 Google Play x86_64 模拟器 emulator-5556、WebView145，默认1080×2400／420dpi，真实280／390px尺寸检查。此记录不声称所有安卓版本、真机或帧率已验收。

已通过：47工程／业务检查；真实WebView UI12、控件26、切页41、经验接续11、十阶段9、MAX6，共105条件。业务状态由真实事务生成，不能把临时画廊或中间帧当成产品功能／实时FPS。

账号：真实虚构账号登录、加密凭证、无网页明文JWT、重载／冷启动／离线身份、离线保存、令牌刷新、重连、退出清除通过。断网退出一致性亦通过，最终账号12条件；两种网页缓存无明文JWT。云原生上传、重复重试、过期版本冲突、回读一致、恢复原测试云快照通过；恢复保留原业务内容，云版本正常递增。

备份：原生SAF虚构JSON导出／导入／取消已实际操作；正式签名包导出11XP，恢复Windows实际保存的199.902727XP备份，再导出并在真实Windows应用反向恢复，账本、冻结参数、0星一致。恢复前取消当前备份保持最新197.902727XP。最终后台IO／严格UTF8实测8条件及正式包最新8条件均通过；新原生前后台／键盘／返回／草稿实测10条件通过。

Windows：拆分入口的真实源码及unpacked EXE smoke通过，packaged=true；11XP保存／恢复、51素材／48徽章、五页、账号框、成长与启动页检查通过。本轮不表示重新做了NSIS安装升级。

发现并处理：SDK persistence=none仍默认写浏览器存储，改为完整SimpleStorage内存适配；setSession不总返回用户资料，按已验证subject恢复身份；仅存两枚令牌不足以恢复RDB访问，完整SDK缓存加密保存；自动刷新同步加密；断网后模拟器Wi-Fi需恢复原AndroidWifi。旧切页与阶段中间帧检查遇到模拟器时序漏帧，改为实际动画暂停中间帧／恢复，清理临时画廊并恢复实际尺寸。MAX脚本补上现行勋章“收下”操作。均不以首轮失败当通过。

命令：node scripts/check.mjs；node scripts/android-build.mjs；node scripts/android-ui-acceptance.mjs ui|controls|pages|flow|stages|max；设置RATER_ANDROID_TEST_CREDENTIALS为忽略的虚构账号JSON（含username/password/id），运行node scripts/android-account-acceptance.mjs和node scripts/android-cloud-acceptance.mjs。真实原生控件工具scripts/android-native-ui.mjs。

报告／截图在output/android、output/desktop，均忽略。测试只操作隔离模拟器、隔离Windows数据和指定虚构云账号。签名密钥已同内容备份到主工作区runtime-data/android-signing，不入库；构建自动使用主工作区签名，RATER_ANDROID_SIGNING_DIR可指定既有私有目录。

最新实现检查点已集入main／Windows工作区并上传PRIVATE，APK签名已核验并复制主目录release/android。邮箱验收已完成，最新交付结果见下方。长期数据／GPU性能、完整辅助功能及其他系统／真机仍未验证。

## 最终邮箱与移动排版验收 · 2026-10-14

真实邮箱验证码提交成功、验证页关闭、加密身份一致、两种网页缓存无明文JWT、强制关闭后冷启动保持身份共5条件通过。仅检查身份，不向该用户账号灌入业务测试记录；完成后退出。凭证与验证码仅临时运行数据，不入库。

依用户顺序，在功能验收后优化安卓专属 mobile.css：页头分层、紧凑成长／评分卡、整行日期、横向任务／徽章筛选、横向系数卡、纵向备份按钮、五等分导航、窄屏44px点击、弹窗内部滚动及横屏紧凑布局。Windows样式和结算规则未改。优化后47工程／业务、控件26、切页41、原生键盘／返回／后台10、原生文件8通过。280／320／411px竖屏及914×411横屏共20个页面检查，无根页面横向溢出，导航与评分点击区域通过，已检查实际截图。

最终签名正式包真实UI8条件复验全部通过：登录、冷启动、同签名同版本覆盖保留账号、退出回访客、任务／历史／奖励／设置。首轮出现登录失败；检查脚本曾把输入框内用户名当成功，已改成非编辑身份文字且有退出按钮，原生输入等待焦点稳定并清空后重试。独立回查凭据有效、调试包原生输入逐字段一致，复验以账号中心和冷启／覆盖结果为准，不把首轮失败记成通过。原生UI树偶发null，按最新观察重读，未复用旧树。

正式产物 release/android/Rater-Tracker-Android-0.1.0-alpha.1-release.apk，98,109,524字节，SHA256 825460cd1bf81027a5c167f245f7455f90fbb80e3be8b8fdb763d6b8b5d464a0；签名v2验证通过、RSA3072，证书SHA256 648b3a169d4b63da50312f44fc09241e8e796a39b781baa60e48a42719c60448。已同内容复制主工作区稳定目录，SHA256.txt及三张手机／横屏预览在同目录。安装包／截图均忽略，不入Git。

边界保持：未使用实体安卓手机，未穷举其他Android版本／厂商系统、长期大数据、帧率及完整辅助功能，Windows NSIS安装升级未在本轮重跑。
