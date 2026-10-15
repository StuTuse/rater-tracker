# 双平台 GitHub 发布流程

用户于2026-10-14明确要求以后每次项目改动都上传GitHub并发布Release。`StuTuse/rater-tracker`已按用户2026-10-15的明确要求改为PUBLIC。每个完成的应用、工程、测试或文档改动都提交并推送集成后的`main`，同时创建新的双平台Release；不上传个人数据、运行快照、测试凭证、签名私钥或签名配置。

## 当前已发布版本

Windows桌面`0.1.0-alpha.17`，Android`0.1.0-alpha.2`／VERSION_CODE=2。首个统一双平台Release标签为`dual/2026.10.14.1`，源码对应提交包含两端当前实现；Release资产含Windows Setup、Android APK及合并的SHA-256清单。Windows安装程序未签名，Android沿用原RSA3072证书并通过APK v2验证。双平台Release：[dual/2026.10.14.1](https://github.com/StuTuse/rater-tracker/releases/tag/dual%2F2026.10.14.1)。

Windows alpha.17安装程序为203,249,318字节，SHA-256`7BAD8D524600EE15B4495142601A7D94A9A9E66C3C02860D8364FFA27AE24140`。它由既有alpha.17验收生成，本次未重跑NSIS安装升级。Android alpha.2正式APK为98,111,149字节，SHA-256`74CC4B5D0D8E87249900A91A8F78527DDA28DD877A1B720DCCB9200C25725711`；签名／版本及范围见[Android alpha.2验收](Android-alpha.2验收记录.md)。构建文件留在本地主目录`release/`，不进入源码Git。

## 后续每次改动

1. 先检查交接、工作日志、`git status`、已有标签及远程Release；按worktree隔离规则工作。
2. 完成与改动相称的检查。应用版本只在对应平台应用代码改变时递增；Android同签名更新增加VERSION_CODE并保留既有密钥。纯文档改动不改变平台版本、不重新构建APK／EXE。
3. 更新规范／README（适用时）、WORKLOG和SESSION_HANDOFF。检查完整暂存区，只提交本次已审阅内容。
4. 提交并推送`main`。创建当天尚未使用的下一个附注tag`dual/YYYY.MM.DD.N`，确保Release源码同时包含已集成的双端实现。
5. 在PUBLIC仓库创建prerelease；标题及说明列出Windows／Android当前应用版本、此次实际改动、检查结果和未覆盖内容。
6. 对本次发生应用变化的平台，构建对应安装包，核对文件名、版本、大小、SHA-256及签名，上传新的二进制和统一SHA-256清单。另一平台没有变化时，在Release说明中链接最近双平台Release对应资产，不重复上传大型二进制。纯文档变化也创建Release，提供新的源码快照，无须上传未变化的二进制。首次发布或明确要求同一Release双端配套安装包时，两端二进制一同上传。
7. 通过`gh release view`读回仓库、tag、附件文件名、大小；下载或读取附件校验值，并确认仓库为PUBLIC，之后报告成功。失败、资产不符须记入工作日志并修正，保留已存在Release和标签，不覆盖旧附件。

双端流水线示例（资产和版本应按真实改动准备，Release说明使用文件保存真实换行）：

```powershell
git status --short
git diff --cached --check
git commit -m 'fix(android): describe the change'
git push origin main
git tag -a dual/2026.10.14.2 -m 'Dual platform release batch 2'
git push origin refs/tags/dual/2026.10.14.2
gh release create dual/2026.10.14.2 --repo StuTuse/rater-tracker --target main --prerelease --title 'Rater & Tracker 双平台预览 · Windows X / Android Y' --notes-file release-notes.md
```

双端应用入口、版本递增和安装包构建命令见README及[版本管理规范](../版本管理规范.md)。网络代理只在本机确有需要时通过单命令设置，不改全局Git配置。仅将用户授权的应用安装包作为GitHub Release附件；仓库保持PUBLIC且不更换远程。
