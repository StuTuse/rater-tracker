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
| License | 待权利人决定；仓库目前没有根LICENSE |
| Contact | 待申请人在服务表单中填写，不公开保存 |

## 英文项目说明草稿

Rater & Tracker is a personal daily-rating and task-growth application. It provides offline guest use, local persistence, JSON backups, and optional account-based cloud synchronization. The Windows application uses Electron and an NSIS installer. The repository also includes an Android application.

The project and downloadable preview releases are public on GitHub. The application author and branding are TuseCreation. We are preparing an application for free open-source code signing; we have not yet completed license selection or eligibility review.

We plan to build Windows releases from a fixed source commit on GitHub-hosted Windows runners, verify their origin through the supported GitHub integration, and require manual approval for production signing. The current release was built locally and is provided only as a packaging sample, not as an already verified CI artifact.

Our intended signing scope includes the branded application executable, generated NSIS uninstaller, and final installer. The application executable is derived from the upstream Electron runtime with project resources and metadata applied. We need your review of the allowed signing scope and applicable upstream-source requirements before implementation. We do not propose re-signing all third-party executables or libraries under the project's identity.

Account sign-in enables automatic synchronization of account data snapshots with Tencent CloudBase. Offline guest use is available. We still need to complete the privacy disclosures and any required installer notices or controls before asserting compliance with the Foundation's conditions.

## 提交前未决项

- 用户决定开源许可证，并确认有权授权自有源码与素材；保留第三方许可／通知。
- 用户确认接受证书主体为SignPath Foundation，作者继续TuseCreation。
- 申请人联系方式、维护／评审／批准角色与双方MFA状态由本人确认。
- 完成隐私及安装披露、签名政策、可信CI样包；服务方确认Electron／NSIS签名范围。
- 正式申请表可能要求其他字段，以[实际入口](https://signpath.org/apply)为准；本次网页读取未取得嵌入表单字段，没有编造已提交记录或审批结果。

正式Code signing policy在获批后再发布，含服务署名、成员角色与隐私入口；当前不以该草稿宣称服务方已为本软件背书。
