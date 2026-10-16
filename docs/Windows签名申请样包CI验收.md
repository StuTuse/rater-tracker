# Windows签名申请样包CI验收 · 2026-10-16

本次只启用GitHub未签名评估样包CI。用户明确同意追加workflow权限，已通过GitHub官方设备流程完成；账号StuTuse和workflow scope只读回查通过。没有接入SignPath、接受其服务协议、提交申请或设置签名令牌。作者保持TuseCreation，SmartScreen仍未解决。

## 最终验证的构建

- [运行38844270607](https://github.com/StuTuse/rater-tracker/actions/runs/38844270607)：success。
- 源码提交：`fd8e6e938311eb6e4cce6073e5e98884cd53a784`。
- 工作流：[windows-signing-sample.yml](../.github/workflows/windows-signing-sample.yml)，GitHub托管Windows2025，Node24、锁文件npm ci、electron-builder26.15.3。
- 仅main／本仓库手动触发，contents只读、Action固定SHA、无秘密引用／签名／自动发布步骤。
- `npm run check`实际55项，55通过、0失败；NSIS构建、主程序／安装程序NotSigned与作者检查、两个附件上传均通过。
- 先前运行[38843223021](https://github.com/StuTuse/rater-tracker/actions/runs/38843223021)也成功；随后补充小报告附件并重跑，上面的最终结果对应实际调整后的流程。

## 附件与来源

两个附件均位于最终运行的Artifacts区域，有效期至 **2026-10-30**；不是永久Release安装包。过期可从main手动重新构建，哈希按新运行核对。

| 附件 | GitHub ID | ZIP大小／SHA-256 |
| --- | --- | --- |
| unsigned-windows-signing-sample-38844270607 | 12022498231 | 203,255,676字节；`6d4fad8084fdb26c399fe92329889c8588f89284cf07ac29516568f0c016616a`（GitHub元数据，未本地完整复算） |
| windows-signing-report-38844270607 | 12022223694 | 1,370字节；`0f089300e913ddd3c31a43d997328aeeac761d014dfd568c6bb55b351f0482ad`（完整下载并复算一致） |

报告包含`sample-origin.json`和`SOURCE-LICENSE.txt`。本地核对ZIP仅这两个预期条目、路径安全、来源提交／运行ID／版本与GitHub一致，MIT源码许可逐字节一致。没有在报告中加入本机路径、个人资料或凭据。

报告中的文件信息由CI在完成构建后实际计算：

| 文件 | 大小 | SHA-256 |
| --- | --- | --- |
| Rater-Tracker-0.1.0-alpha.21-Setup.exe | 203,224,782字节 | `70ae84215b42a64d7ea70bdb0bbe739c158a27411497dba968fca9191a3d4629` |
| win-unpacked/Rater & Tracker.exe | 246,302,208字节 | `11dbe6fe3ac249d092a92fc9f2e1acb571523ce6be59d476b5b40ffb4e4b6910` |

二者CompanyName均为TuseCreation、ProductName均为Rater & Tracker、Authenticode均NotSigned。Setup ProductVersion为0.1.0-alpha.21，主EXE为数值0.1.0.0；不要把预览字符串直接当作所有PE字段的限制值。

## 检查范围

已核对真实CI日志、工程55项、打包和CI内签名／作者检查、小报告完整ZIP摘要与内容。完整安装包本地下载速度过慢而取消，残留不完整ZIP已清理；没有把上述EXE哈希写成本地独立复算。没有运行／安装该CI包，没有执行Windows升级或桌面smoke，也没有新测Android。

Windowsalpha.21／Androidalpha.6正式预览Release仍引用[dual/2026.10.16.1](https://github.com/StuTuse/rater-tracker/releases/tag/dual/2026.10.16.1)；本次没有替换其二进制或哈希。申请样包与旧正式预览包的同版本文件可能因构建环境／时间而哈希不同，应始终按对应运行的报告使用。

## 申请下一步

申请资料的Build System可按实际情况填写GitHub Actions，并提供本运行链接。该成功CI尚未与SignPath来源验证绑定，不能声称已获其审核或签名。申请人仍自行处理姓名、邮箱、MFA及服务同意；完整许可审计、安装隐私披露／选项和Electron／NSIS可签范围审核继续按[接入方案](免费开源签名接入方案.md)推进。
