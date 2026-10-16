# 当前交接 · 2026-10-16

## 现行状态

用户已回复“接受”，同意MIT许可与SignPath Foundation证书发布者，作者仍TuseCreation；随后选择亲自填写申请表的姓名和邮箱。不要重复询问这两项许可／身份决定，也不从本机历史资料推断姓名邮箱。新增根LICENSE、[Code signing policy](docs/CODE_SIGNING_POLICY.md)、[Privacy policy](docs/PRIVACY.md)和[第三方许可初步清单](docs/THIRD_PARTY_NOTICES.md)，更新[接入方案](docs/免费开源签名接入方案.md)与[申请资料](docs/SignPath申请草稿.md)。本轮负责上述文档及手动[Windows未签名样包模板](docs/signing/windows-signing-sample.yml.example)，不改应用代码／版本或其他worktree。GitHub拒绝启用工作流的推送（当前凭据无workflow权限），CI未运行，模板仅保留docs中；后续取得权限后再启用，不等于正式签名流水线。

SignPath申请表已在浏览器打开并预填部分公开项目资料；用户自行处理姓名、邮箱及服务同意／提交。尚未发送申请、安装GitHub App或设置签名令牌；Windows仍未签名。MFA问题未获回复；完整许可审计、安装披露／选项和Electron／NSIS签名范围需继续完成，不能把源码隐私文件视为安装器合规验收。Windowsalpha.21／Androidalpha.6及.1Release包保持；本轮发布源码／工程准备批次，不替换二进制。

源码main已推送0c19bb5，GitHub识别MIT，LICENSE blob与本地一致；[dual/2026.10.16.6](https://github.com/StuTuse/rater-tracker/releases/tag/dual/2026.10.16.6)为非Draft prerelease、无新二进制，tag／main核对一致。回读随源码收尾批次.16.7发布。当前GitHub凭据没有workflow scope，样包模板未启用、CI未运行；不要宣称可信CI样包已具备。浏览器仅确认基础资料及隐私URL，随后补填／截图连续超时；用户个人字段保持自行操作，不公开记录，未点击提交。

方案提交2dc849b及附注tag已推送；[dual/2026.10.16.3](https://github.com/StuTuse/rater-tracker/releases/tag/dual/2026.10.16.3)回读draft=false／prerelease=true／无二进制附件，远端main及tag一致，仓库PUBLIC。共享目录另一会话随后提交1a76ace并使用.4，已保留其内容；本签名回读随源码收尾批次`dual/2026.10.16.5`发布，现有安装包仍引用.1。

Windows当前`0.1.0-alpha.21`，Android`0.1.0-alpha.6`／`VERSION_CODE=6`；规则1.3／JSON1。作者统一TuseCreation，Windows CompanyName／版权已核对，但本机无受信任代码签名身份，包仍NotSigned，SmartScreen未解决；`npm run dist:signed`已验证缺证书时拒绝构建。桌面当前开发验收快捷方式也指向未签名Electron，EXE未带Zone.Identifier，本轮未改快捷方式。需要用户提供已有证书／云签名服务，或决定合适的外部签名／商店路径，不能以改作者字段或自签根证书冒充解决。

Android增加原证书v1／v2／v3，并在复制正式包前核对签名、原证书指纹、包名和版本；缺配置停止且不自动生成替代密钥。原alpha.5的v2有效，且在新隔离模拟器也能安装，故手机失败根因尚未确认；新alpha.6已通过Android17隔离模拟器的全新安装、5→6覆盖、同版本重装及虚构访客3星／11XP保持。无真实账号／云写入。缺少用户手机机型／系统／具体文件与完整错误，不能扩大为真机问题已解决。完整检查与待办见W054和[签名与安装排查](docs/应用签名与安装排查.md)。

本轮Windows Setup 203,308,084字节，SHA-256 `36040d2cc41346eee3c768947ae5385564730ed6ec5071526ae765f9072f7265`；Android APK 98,181,202字节，SHA-256 `45c7970027d6c572617acdc753fb5682c47433672c264a566624527e783b2d08`。55项工程业务、签名负例／直接Gradle缺配置拒绝、Windows普通临时目录打包smoke通过。安装升级Windows／实际手机／真实Windows签名未覆盖。[dual/2026.10.16.1](https://github.com/StuTuse/rater-tracker/releases/tag/dual%2F2026.10.16.1)已发布，源码提交ae62e3a；main／tag及三个附件大小／digest回读一致，仓库PUBLIC。回读记录随文档专用批次`dual/2026.10.16.2`发布，应用包继续引用.1，不重建。

本轮邮件验证码样式草稿位于`cloud/email/register-sign-in.html`：淡黄色应用手账底纹、居中新版图标、软件名称、`TuseCreation`与大号验证码。CloudBase `ModifyProvider`后读回`TemplateConfig=null`，计费接口无套餐返回；官方套餐表指示邮件样式需要相应套餐。没有升级或声称线上已生效，见W053及`cloud/README.md`。

上一轮图标应用与附件批次`dual/2026.10.15.5`、收尾源码`dual/2026.10.15.6`已发布；仓库`StuTuse/rater-tracker`为PUBLIC。此前同步策略及公开状态详见W050—W053。

双端源码已集成到`main`并推送GitHub仓库（当时为PRIVATE，当前为PUBLIC）`StuTuse/rater-tracker`。首个双平台Release为[`dual/2026.10.14.1`](https://github.com/StuTuse/rater-tracker/releases/tag/dual%2F2026.10.14.1)，含Windows alpha.17安装包、Android alpha.2签名APK和SHA-256清单；远端附件校验已完成。Windows包未签名，本轮未验证Windows安装／升级；不要把Android模拟器验收扩大为实体手机、其他系统或性能结论。

用户要求今后每次完成的项目改动均推送公开仓库并发布双平台GitHub prerelease。规则及步骤见`AGENTS.md`、`版本管理规范.md`第10节和[双平台GitHub发布流程](docs/双平台GitHub发布流程.md)：按影响升级各自平台版本，Android递增`VERSION_CODE`并沿用签名；代码改动上传受影响平台新包，未变端引用最近Release；纯文档改动发布源码Release但不重建应用。不得擅自改变可见性、添加远程、强推或改动旧标签；个人数据、凭证和签名材料不得上传。

## 当前工作区

此前Windows开发快捷方式修复见W048；星级动画见W049。本轮只在main负责Android签名配置／构建与验签脚本、双端作者和版本元数据、发布文档；没有修改另一worktree、结算或同步业务。新建的RaterSigningAcceptance AVD、独立5038端口ADB、私有测试密钥与报告均在忽略目录；测试模拟器未登录账号，模拟器与专用ADB已关闭，临时Windows副本已清理。

本目录为集成`main`。当前发布批次及仓库可见性以W054和后续远端回读为准。Windows与Android开发worktree的登记见[工作区隔离登记](docs/工作区隔离登记.md)；本会话无权覆盖其他worktree中的改动。

此前全项目文档审核已更新README、版本规范、工作区／Android状态、数据契约、CloudBase、徽章清单、归档说明与交接；工作过程见W046，Release创建结果见W047及上述本次回读。保持原有标签与Release，不重复创建同名批次。

## 权威文档

- 产品、结算与数据行为：`最终方案.md`；规则版本`1.3`，格式`1`。
- 视觉、动画与48枚徽章：`视觉与动效规范.md`、`徽章设计清单.md`。
- 双平台入口、构建、当前版本与Release：`README.md`、`CHANGELOG.md`、`版本管理规范.md`。
- 共享持久化与数据契约：`docs/数据契约.md`；双端工程与隐私隔离：`docs/工作区隔离登记.md`。
- 完成事项按追加方式记录到`WORKLOG.md`；验收报告只描述其对应历史构建和实际检查范围。

旧`项目规划.md`、`机制定稿候选.md`、`analysis/经验成长模拟.md`及历史验收文件均属归档／历史记录，不是当前规则、未完成清单或用户确认请求。遇到冲突以本节所列现行文档和最新用户明确要求为准。

## 2026-10-16 · 云端账号清理结果

已按用户明确要求删除当前4个非管理员云端账号，CLI返回4成功／0失败；再次查询total=1，仅剩ACTIVE的内置超级管理员administrator。未删除云端业务快照／回执表或本地数据。此轮只负责账号操作和本节／WORKLOG追加，应用与安装包不变；不公开被删账号的UID或邮箱。签名方案及其他既有待办保持原记录。
