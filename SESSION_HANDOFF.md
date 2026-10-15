# 当前交接 · 2026-10-15

## 现行状态

Windows 桌面当前为`0.1.0-alpha.19`，Android 为`0.1.0-alpha.4`／`VERSION_CODE=4`；产品方案`v1.25`、视觉规范`v1.19`、结算规则`1.3`、JSON格式`1`。用户要求启动立即后台读取云端并保留修改时间较新一端。已改为pull先行，账号保存附modifiedAt；云端较新自动下载，本机较新自动上传，云版本变化重新核对。旧快照无时间按版本兼容；记录不合并、不重算奖励。55项检查、模拟账号真实页面3项、新Windows包普通临时目录隔离smoke、Android构建／原证书v2验证通过。Android设备现场、真实云账号和安装升级未覆盖；详见W050与[同步验收](docs/双端同步时间策略验收.md)。修复提交07485af已推送main；[dual/2026.10.15.1](https://github.com/StuTuse/rater-tracker/releases/tag/dual%2F2026.10.15.1)已发布为prerelease，发布时仓库PRIVATE，附件大小／SHA-256及远端标签指向均回读一致，见W051。仓库于2026-10-15按用户明确要求改为PUBLIC，扫描42个可达提交未发现常见凭证／个人数据模式或风险文件名，远端可见性及匿名读取验证见W052。

双端源码已集成到`main`并推送GitHub仓库（当时为PRIVATE，当前为PUBLIC）`StuTuse/rater-tracker`。首个双平台Release为[`dual/2026.10.14.1`](https://github.com/StuTuse/rater-tracker/releases/tag/dual%2F2026.10.14.1)，含Windows alpha.17安装包、Android alpha.2签名APK和SHA-256清单；远端附件校验已完成。Windows包未签名，本轮未验证Windows安装／升级；不要把Android模拟器验收扩大为实体手机、其他系统或性能结论。

用户要求今后每次完成的项目改动均推送公开仓库并发布双平台GitHub prerelease。规则及步骤见`AGENTS.md`、`版本管理规范.md`第10节和[双平台GitHub发布流程](docs/双平台GitHub发布流程.md)：按影响升级各自平台版本，Android递增`VERSION_CODE`并沿用签名；代码改动上传受影响平台新包，未变端引用最近Release；纯文档改动发布源码Release但不重建应用。不得擅自改变可见性、添加远程、强推或改动旧标签；个人数据、凭证和签名材料不得上传。

## 当前工作区

上轮Windows开发快捷方式修复见W048；星级动画见W049。本轮仅在main负责`packages/data/sync.js`／`storage.js`、UI账号说明、同步测试与双端版本／构建／文档。其他worktree未修改。Windows Setup 203,260,545字节，SHA-256 `1fa39e482dbe4cb5fa9b9943bab34214f00b20067d96da352a059b268a6dc332`；Android alpha.4 APK 98,112,165字节，SHA-256 `8950c28749b34934ed0bcfe664d70756ee263660edb8b36650a92077440c0aea`；包和统一清单在忽略的release目录。默认受管项目目录运行新Windows包返回0x80000003，同一包复制到普通临时目录通过，未改系统设置。

本目录为集成`main`。上轮同步修复前HEAD为`2d72b61`；当前仓库可见性和发布批次以W052及远端回读为准。Windows与Android开发worktree的登记见[工作区隔离登记](docs/工作区隔离登记.md)；本会话无权覆盖其他worktree中的改动。

此前全项目文档审核已更新README、版本规范、工作区／Android状态、数据契约、CloudBase、徽章清单、归档说明与交接；工作过程见W046，Release创建结果见W047及上述本次回读。保持原有标签与Release，不重复创建同名批次。

## 权威文档

- 产品、结算与数据行为：`最终方案.md`；规则版本`1.3`，格式`1`。
- 视觉、动画与48枚徽章：`视觉与动效规范.md`、`徽章设计清单.md`。
- 双平台入口、构建、当前版本与Release：`README.md`、`CHANGELOG.md`、`版本管理规范.md`。
- 共享持久化与数据契约：`docs/数据契约.md`；双端工程与隐私隔离：`docs/工作区隔离登记.md`。
- 完成事项按追加方式记录到`WORKLOG.md`；验收报告只描述其对应历史构建和实际检查范围。

旧`项目规划.md`、`机制定稿候选.md`、`analysis/经验成长模拟.md`及历史验收文件均属归档／历史记录，不是当前规则、未完成清单或用户确认请求。遇到冲突以本节所列现行文档和最新用户明确要求为准。
