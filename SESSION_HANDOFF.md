# 当前交接 · 2026-10-16

## 现行状态

Windows当前`0.1.0-alpha.21`，Android`0.1.0-alpha.6`／`VERSION_CODE=6`；规则1.3／JSON1。作者统一TuseCreation，Windows CompanyName／版权已核对，但本机无受信任代码签名身份，包仍NotSigned，SmartScreen未解决；`npm run dist:signed`已验证缺证书时拒绝构建。需要用户提供已有证书／云签名服务，或决定合适的外部签名／商店路径，不能以改作者字段或自签根证书冒充解决。

Android增加原证书v1／v2／v3，并在复制正式包前核对签名、原证书指纹、包名和版本；缺配置停止且不自动生成替代密钥。原alpha.5的v2有效，且在新隔离模拟器也能安装，故手机失败根因尚未确认；新alpha.6已通过Android17隔离模拟器的全新安装、5→6覆盖、同版本重装及虚构访客3星／11XP保持。无真实账号／云写入。缺少用户手机机型／系统／具体文件与完整错误，不能扩大为真机问题已解决。完整检查与待办见W054和[签名与安装排查](docs/应用签名与安装排查.md)。

本轮Windows Setup 203,308,084字节，SHA-256 `36040d2cc41346eee3c768947ae5385564730ed6ec5071526ae765f9072f7265`；Android APK 98,181,202字节，SHA-256 `45c7970027d6c572617acdc753fb5682c47433672c264a566624527e783b2d08`。55项工程业务、签名负例／直接Gradle缺配置拒绝、Windows普通临时目录打包smoke通过。安装升级Windows／实际手机／真实Windows签名未覆盖。本轮批次`dual/2026.10.16.1`待推送发布并回读。

本轮邮件验证码样式草稿位于`cloud/email/register-sign-in.html`：淡黄色应用手账底纹、居中新版图标、软件名称、`TuseCreation`与大号验证码。CloudBase `ModifyProvider`后读回`TemplateConfig=null`，计费接口无套餐返回；官方套餐表指示邮件样式需要相应套餐。没有升级或声称线上已生效，见W053及`cloud/README.md`。

上一轮图标应用与附件批次`dual/2026.10.15.5`、收尾源码`dual/2026.10.15.6`已发布；仓库`StuTuse/rater-tracker`为PUBLIC。此前同步策略及公开状态详见W050—W053。

双端源码已集成到`main`并推送GitHub仓库（当时为PRIVATE，当前为PUBLIC）`StuTuse/rater-tracker`。首个双平台Release为[`dual/2026.10.14.1`](https://github.com/StuTuse/rater-tracker/releases/tag/dual%2F2026.10.14.1)，含Windows alpha.17安装包、Android alpha.2签名APK和SHA-256清单；远端附件校验已完成。Windows包未签名，本轮未验证Windows安装／升级；不要把Android模拟器验收扩大为实体手机、其他系统或性能结论。

用户要求今后每次完成的项目改动均推送公开仓库并发布双平台GitHub prerelease。规则及步骤见`AGENTS.md`、`版本管理规范.md`第10节和[双平台GitHub发布流程](docs/双平台GitHub发布流程.md)：按影响升级各自平台版本，Android递增`VERSION_CODE`并沿用签名；代码改动上传受影响平台新包，未变端引用最近Release；纯文档改动发布源码Release但不重建应用。不得擅自改变可见性、添加远程、强推或改动旧标签；个人数据、凭证和签名材料不得上传。

## 当前工作区

此前Windows开发快捷方式修复见W048；星级动画见W049。本轮只在main负责Android签名配置／构建与验签脚本、双端作者和版本元数据、发布文档；没有修改另一worktree、结算或同步业务。新建的RaterSigningAcceptance AVD、独立5038端口ADB、私有测试密钥与报告均在忽略目录；测试模拟器未登录账号。

本目录为集成`main`。当前发布批次及仓库可见性以W054和后续远端回读为准。Windows与Android开发worktree的登记见[工作区隔离登记](docs/工作区隔离登记.md)；本会话无权覆盖其他worktree中的改动。

此前全项目文档审核已更新README、版本规范、工作区／Android状态、数据契约、CloudBase、徽章清单、归档说明与交接；工作过程见W046，Release创建结果见W047及上述本次回读。保持原有标签与Release，不重复创建同名批次。

## 权威文档

- 产品、结算与数据行为：`最终方案.md`；规则版本`1.3`，格式`1`。
- 视觉、动画与48枚徽章：`视觉与动效规范.md`、`徽章设计清单.md`。
- 双平台入口、构建、当前版本与Release：`README.md`、`CHANGELOG.md`、`版本管理规范.md`。
- 共享持久化与数据契约：`docs/数据契约.md`；双端工程与隐私隔离：`docs/工作区隔离登记.md`。
- 完成事项按追加方式记录到`WORKLOG.md`；验收报告只描述其对应历史构建和实际检查范围。

旧`项目规划.md`、`机制定稿候选.md`、`analysis/经验成长模拟.md`及历史验收文件均属归档／历史记录，不是当前规则、未完成清单或用户确认请求。遇到冲突以本节所列现行文档和最新用户明确要求为准。
