# SignPath Foundation申请草稿 · 2026-10-16

本文件是待完善申请资料，**未发送**。不得直接将下列未决项填写成已满足；联系信息不写入公开仓库。配套步骤见[免费开源签名接入方案](免费开源签名接入方案.md)。

## 可用的公开项目信息

| 字段 | 内容 |
| --- | --- |
| Project | Rater & Tracker |
| Author / brand | TuseCreation |
| Repository / project page | https://github.com/StuTuse/rater-tracker |
| Maintainer account | StuTuse（具体申请人及职责待本人确认） |
| Existing release | https://github.com/StuTuse/rater-tracker/releases/tag/dual/2026.10.16.1 |
| Windows package | Rater-Tracker-0.1.0-alpha.21-Setup.exe；当前未签名，仅作结构样本 |
| Platforms | Windows x64 Electron / NSIS；Android由原有独立证书签名 |
| License | MIT（用户已接受，根LICENSE版权人为2026 TuseCreation；第三方许可保持） |
| Code signing policy | https://github.com/StuTuse/rater-tracker/blob/main/docs/CODE_SIGNING_POLICY.md |
| Privacy policy | https://github.com/StuTuse/rater-tracker/blob/main/docs/PRIVACY.md |
| Contact | 待申请人在服务表单中填写，不公开保存 |

## 英文项目说明草稿

Rater & Tracker is a personal daily-rating and task-growth application. It provides offline guest use, local persistence, JSON backups, and optional account-based cloud synchronization. The Windows application uses Electron and an NSIS installer. The repository also includes an Android application.

The project and downloadable preview releases are public on GitHub. Original project contributions are available under the MIT license, with third-party components retaining their respective licenses. The application author and branding are TuseCreation. The maintainer accepts the proposed SignPath Foundation certificate identity. Eligibility review has not been completed.

A manual Windows sample workflow template has been prepared for GitHub-hosted runners. It is inactive because the current GitHub credential lacks workflow permission; no CI build has run. Production signing is not implemented. We plan to verify build origin through the supported GitHub integration and require manual approval. The existing published preview was built locally and must not be represented as a verified CI artifact.

Our intended signing scope includes the branded application executable, generated NSIS uninstaller, and final installer. The application executable is derived from the upstream Electron runtime with project resources and metadata applied. We need your review of the allowed signing scope and applicable upstream-source requirements before implementation. We do not propose re-signing all third-party executables or libraries under the project's identity.

Account sign-in enables automatic synchronization of account data snapshots with Tencent CloudBase. Offline guest use is available. A source privacy notice documents the behavior and current limitations. Installer notices or controls and complete dependency/license review remain outstanding before we can assert compliance with the Foundation's conditions.

## 提交前未决项

- MIT及Foundation证书主体已由用户接受，不再重复询问；仍需完成最终分发包的第三方通知／素材权利核查。
- 申请人联系方式、维护／评审／批准角色与双方MFA状态由本人确认。
- 源码隐私说明和签名政策已准备；安装披露／选项、CI样包实际结果及服务方Electron／NSIS范围审核仍需完成。
- 已通过浏览器看到[实际入口](https://signpath.org/apply)的嵌入表单；用户选择亲自填写姓名和邮箱，表单尚未提交。

## 表单填写依据（已读取实际页面）

必填项含Project Name、Repository URL、Homepage URL、Tagline、Category、Description、Reputation、Build System、First Name、Last Name、Email和Primary Discovery Channel；可填Download URL、Privacy Policy URL、Maintainer Type等。表单还要求接受Foundation条件和个人资料处理，可选营销订阅不必勾选。

Reputation应如实说明项目为早期预览，提供仓库和Release记录；当前没有已核实的广泛使用／媒体报道证据，不能编造。Build System必须按实际CI运行结果填写；不能在工作流尚未成功时宣称已有成功可信构建。Category和Maintainer Type以实际下拉选项选择，不虚构选项值。

姓名、邮箱、服务条款同意和提交由用户处理。申请入口已预填部分公开项目信息；源码中的政策不表示SignPath已经为项目背书。
