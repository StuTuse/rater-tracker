# Android移植检查记录入口

本文件曾是移植过程中的临时检查点；安卓移植及已列模拟器验收已完成，不再标为“进行中”。当前版本为`0.1.0-alpha.2`／`VERSION_CODE=2`。实际完成范围、检查命令和未覆盖项见[Android验收记录](Android验收记录.md)及[Android alpha.2按压专项验收](Android-alpha.2验收记录.md)。

当前工程位于`apps/android`，共享模块为`packages/core`、`packages/data`、`packages/ui`。构建／同步命令及本机工具要求以[README](../README.md)为准；双端责任边界见[工作区隔离登记](工作区隔离登记.md)。

本页不再维护旧的进行中清单。后续新增Android检查应按实际结果写入对应验收记录，并遵守每次改动推送私有GitHub、发布双平台Release的[流程](双平台GitHub发布流程.md)。
