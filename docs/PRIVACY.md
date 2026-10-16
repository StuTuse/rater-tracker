# Privacy policy / 隐私说明

适用项目：Rater & Tracker。维护者／软件作者：TuseCreation，公开仓库由[StuTuse](https://github.com/StuTuse)维护。更新日期：2026-10-16。本说明按当前Windows alpha.21、Android alpha.6及源码行为编写；不表示完成法律合规审计或SignPath审核。

## 本地记录

评分、原因文字、任务与推进内容、历史结算和设置保存在设备本地IndexedDB。Windows正常数据在`%APPDATA%\RaterTracker`，Android位于应用私有目录。访客记录和各账号记录分别保存。导出的JSON备份包含业务记录，按用户选择的路径写出；备份不是加密文件，应自行妥善保管。

未登录可使用离线访客功能。访客业务记录不会自动复制到账号；账号中心提供的复制操作需用户主动选择。不要在任务或备注中填写不希望保存或同步的敏感信息。

## 邮箱认证与自动云同步

注册／登录通过腾讯CloudBase SDK处理用户名、邮箱、密码或验证码，以及登录所需的会话信息。邮箱用于验证码和身份验证。应用不将登录密码写入业务备份；认证请求需要把所填信息交给云端认证服务处理。

**登录账号即启用自动同步。** 软件会在启动恢复账号、成功保存、重新联网、返回前台及可见时的定期检查中访问云服务。同步上传／下载该账号的完整业务快照，包括评分与备注、任务内容与推进、结算明细和设置，以及账号标识、版本／修改时间、同步请求标识。按修改时间保留较新一端，因此联网后可能覆盖较早的账号快照。

同步服务使用腾讯CloudBase，当前部署区域为中国上海。认证及同步请求会向服务提供网络请求必需的信息，例如连接来源IP；SDK还管理会话／设备标识。服务方对请求日志等信息的处理适用其政策，项目没有在此承诺服务方的具体保存期限。参考：[腾讯云隐私保护声明](https://cloud.tencent.com/document/product/301/11470)、[CloudBase SDK源码](https://github.com/TencentCloudBase/cloudbase-js-sdk)。

Windows使用Electron safeStorage在本机加密保存可恢复登录会话；Android使用Android Keystore与AES-GCM保存会话文件。**这不代表本地业务数据库或云端快照经过用户独有密钥的端到端加密。** 云服务运维管理员在其授权范围内能够管理相应服务和数据。

## 选择、保留与删除

可以选择不注册／登录并离线使用。成功退出账号后，应用停止该账号的自动同步并清除本机保存的登录会话；退出不等于删除已有本地账号记录、云端快照或认证账号。断网或关闭应用只会暂停后续网络操作，不会撤回已经上传的信息。

可在设置中导出备份并使用已有的本机数据管理功能。卸载Windows程序不主动清除正常数据目录；Android卸载／系统清除应用数据可能移除本地数据，应先导出备份。账号注销及完整云端数据删除目前没有交付自助入口，也没有已实施的定期自动删除期限；删除认证账号不应被解释为关联快照和回执均已删除。

有关隐私或删除请求，请通过维护者双方确认的私密联系渠道处理。项目目前未公布专用联系邮箱；可以在[仓库Issues](https://github.com/StuTuse/rater-tracker/issues)发起不含个人资料的联系请求，**不要公开邮箱、账号凭证、验证码、备份或业务内容**。后续需在面向更广泛用户发布前补齐明确的私密联系入口及删除流程。

## 签名申请与当前限制

SignPath申请表所需的申请人姓名、邮箱及服务同意事项由申请人自行填写；它们不写入公开源码。正式签名尚未接入，应用当前不会为了SignPath签名把用户业务记录发给SignPath。

本次仅发布源码中的说明，**当前已发布安装程序尚未新增此政策展示页或安装选项**；登录界面的披露、安装过程说明及具体退出／删除能力仍需后续实现与验收，不能将本文件当作全部申请条件已满足的证明。

## English summary

Guest records are stored locally. Account registration and sign-in use Tencent CloudBase; signing in enables automatic synchronization of the account's full business snapshot with the service in Shanghai, China. Stored sessions are protected using platform facilities; business records are not claimed to be end-to-end encrypted. Signing out stops account synchronization but does not erase local records, cloud snapshots or the account. JSON exports are not encrypted. Self-service account/cloud deletion and a dedicated private contact address are not yet provided. This source notice has not yet been added to existing installers, and the SignPath application is not submitted or approved.
