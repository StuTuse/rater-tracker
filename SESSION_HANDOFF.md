# 当前交接 · 2026-10-15

## 现行状态

Windows桌面当前为`0.1.0-alpha.20`，Android为`0.1.0-alpha.5`／`VERSION_CODE=5`；结算规则`1.3`、JSON格式`1`。本轮统一了启动页、Windows安装程序与Android的星叶高质量图标，完整检查及边界见W053。`npm run check`／`npm test`各55项通过；Windows Setup 203,225,129字节、SHA-256 `B6A793A2C1F0D2057292443D22365BE91A213EAB690D8ADDEE9A59874E0AD09B`，复制到普通临时目录运行的隔离smoke通过；Android alpha.5 APK 98,130,449字节、SHA-256 `2F532363CB664A5DD8627C09FD9EDD33361F20FCC8DB56BA13F21D819B80C480`，versionCode5及既有证书v2验证通过。Windows安装升级及Android设备未测。双端安装包、SHA清单和预发布已发布至[dual/2026.10.15.5](https://github.com/StuTuse/rater-tracker/releases/tag/dual%2F2026.10.15.5)，远端size／digest和main／tag均回读匹配提交`9c82643`。

本轮邮件验证码样式草稿位于`cloud/email/register-sign-in.html`：淡黄色应用手账底纹、居中新版图标、软件名称、`TuseCreation`与大号验证码。CloudBase `ModifyProvider`后读回`TemplateConfig=null`，计费接口无套餐返回；官方套餐表指示邮件样式需要相应套餐。没有升级或声称线上已生效，见W053及`cloud/README.md`。

本轮应用与附件批次`dual/2026.10.15.5`已发布；为将远端回读结果同步到本交接与日志，文档专用源码批次`dual/2026.10.15.6`随本次更新发布，不重建或重复上传应用包。仓库`StuTuse/rater-tracker`为PUBLIC。此前同步策略及公开状态详见W050—W052。

双端源码已集成到`main`并推送GitHub仓库（当时为PRIVATE，当前为PUBLIC）`StuTuse/rater-tracker`。首个双平台Release为[`dual/2026.10.14.1`](https://github.com/StuTuse/rater-tracker/releases/tag/dual%2F2026.10.14.1)，含Windows alpha.17安装包、Android alpha.2签名APK和SHA-256清单；远端附件校验已完成。Windows包未签名，本轮未验证Windows安装／升级；不要把Android模拟器验收扩大为实体手机、其他系统或性能结论。

用户要求今后每次完成的项目改动均推送公开仓库并发布双平台GitHub prerelease。规则及步骤见`AGENTS.md`、`版本管理规范.md`第10节和[双平台GitHub发布流程](docs/双平台GitHub发布流程.md)：按影响升级各自平台版本，Android递增`VERSION_CODE`并沿用签名；代码改动上传受影响平台新包，未变端引用最近Release；纯文档改动发布源码Release但不重建应用。不得擅自改变可见性、添加远程、强推或改动旧标签；个人数据、凭证和签名材料不得上传。

## 当前工作区

此前Windows开发快捷方式修复见W048；星级动画见W049。本轮只在main负责`assets/app.png`／`.ico`、图标生成脚本、Android drawable图标、邮箱模板草稿及发布文档，不修改另一worktree或同步业务。

本目录为集成`main`。当前发布批次及仓库可见性以W053和本节后续远端回读为准。Windows与Android开发worktree的登记见[工作区隔离登记](docs/工作区隔离登记.md)；本会话无权覆盖其他worktree中的改动。

此前全项目文档审核已更新README、版本规范、工作区／Android状态、数据契约、CloudBase、徽章清单、归档说明与交接；工作过程见W046，Release创建结果见W047及上述本次回读。保持原有标签与Release，不重复创建同名批次。

## 权威文档

- 产品、结算与数据行为：`最终方案.md`；规则版本`1.3`，格式`1`。
- 视觉、动画与48枚徽章：`视觉与动效规范.md`、`徽章设计清单.md`。
- 双平台入口、构建、当前版本与Release：`README.md`、`CHANGELOG.md`、`版本管理规范.md`。
- 共享持久化与数据契约：`docs/数据契约.md`；双端工程与隐私隔离：`docs/工作区隔离登记.md`。
- 完成事项按追加方式记录到`WORKLOG.md`；验收报告只描述其对应历史构建和实际检查范围。

旧`项目规划.md`、`机制定稿候选.md`、`analysis/经验成长模拟.md`及历史验收文件均属归档／历史记录，不是当前规则、未完成清单或用户确认请求。遇到冲突以本节所列现行文档和最新用户明确要求为准。
