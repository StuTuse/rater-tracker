# alpha.7 账号组件与邮箱注册验收

日期：2026-10-13，香港时间；产品文档v1.9、视觉v1.6、结算规则1.3、备份格式1。

## 已实现

左下角常驻默认手绘头像、账号与固定密码掩码，替换原本机／离线说明。未登录显示登录／注册。点击后在入口旁弹出账号浮层，登录／注册分段切换；已登录显示账号中心、同步与备份／复制／退出。复用应用黄主按钮、分段底板、焦点环、弹窗进出与内容切换，窄窗口仍保留头像入口。

官方 CloudBase SDK 邮箱注册：账号、邮箱、密码及确认密码→发送验证码→验证码验证后注册并登录。受限 IPC 传输，验证码回调仅在主进程保留，有效期10分钟；验证成功／退出清除。密码输入关闭时清空，左下角为固定掩码，不显示实际密码。没有改旧结算或SQL同步协议。

## 实际检查与边界

| 检查 | 实际结果 |
| --- | --- |
| npm run check | 33/33：25业务＋5同步＋3注册；语法、版本、51素材通过 |
| 注册流程单元 | 无效输入不发请求；错码重试、流程ID隔离、验证前无身份、验证后不可重放、旧流程／退出清除通过；认证服务模拟 |
| Playwright 真实UI | 点击入口、注册切换、密码不一致、错码重试、模拟验证成功后账号／掩码、退出、关闭清空密码、焦点返回、390px无溢出且浮层在窗口内通过；注册传输模拟，不代表真实邮箱收码 |
| 源码Electron | 真实CloudBase账号恢复／登录、下载11XP、云端v1、账号隔离、表单移除、左下角姓名／掩码、账号浮层、加密会话通过 |
| 最终打包EXE | 同一真实账号检查全部通过；截图已查看 |
| 安装升级 | alpha.6→alpha.7、快捷方式、单实例、11XP／revision1／数据路径保持通过；隔离安装副本卸载 |
| 云端配置 | EmailLogin=true、UserNameLogin=true；email身份源On=TRUE、默认代发On=TRUE实际回读确认；短信／匿名关闭 |

失败记录：首个 UI 脚本误用 module.exports，与工程 Playwright CLI 格式不符，改为 async page 函数通过；HTML pattern 在新版正则v模式中需要转义连字符，修正后无新增控制台错误；分段选中须使用现有 selected 类，修正并查看截图。邮箱策略接口返回成功但EmailLogin仍false，补齐邮箱身份源与默认代发后回读成功。

真实收件、正确验证码到云端新账号完成尚未验证，需要用户自己的邮箱参与。没有发送测试邮件到任意第三方邮箱，没有把模拟注册记录上传云端。默认头像未增加自定义图片上传。网页登录仍受安全域名套餐约束；手机客户端、自助找回密码、长期性能／完整人工验收未交付。既有测试账号清理授权未收到，不处理。

截图／报告：output/playwright/account-register.png、account-login-mobile.png、output/desktop/account/account-smoke.png及json、output/install/report.json，均忽略。UI脚本 scripts/account-ui-acceptance.cjs；先启动 npm run dev，使用专用 Playwright CLI 浏览器 run-code。真实桌面命令：node scripts/account-desktop-smoke.mjs 'release/win-unpacked/Rater & Tracker.exe'。安装命令：& ./scripts/install-acceptance.ps1 -PreviousInstaller 'release/Rater-Tracker-0.1.0-alpha.6-Setup.exe'。

安装包 release/Rater-Tracker-0.1.0-alpha.7-Setup.exe，203,235,616字节，未签名；SHA256：4124A420292D251D05BE5617B95BAEF88DE325B767AF2A5BED924090E295B190。
