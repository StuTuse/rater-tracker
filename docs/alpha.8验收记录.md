# alpha.8 统一账号入口与本机清空验收

日期：2026-10-13，香港时间。产品文档v1.10，结算1.3／备份格式1，视觉v1.6。

删除设置页账号卡片及重复入口，所有账号操作统一放在左下角浮层。退出保留本机记录；未登录表单支持清空输入。用户明确“清空本机账号数据，保留云端记录”，按该口径实现备份后清空当前本机快照／同步元数据及会话，切回未登录记录。

清空先等待已有同步／保存结束，再暂停当前同步引擎，读取最新快照成功导出；该次备份不写lastExport也不触发上传。随后退出，事务内检查导出revision匹配才清除两个当前账号键；不触及云端、未登录或其他账号。导出取消恢复引擎、保留记录；版本变化保留新记录。退出失败不执行删除，退出后删除失败切回未登录，原账号数据仍保存。下次登录可重新下载云端，不重演奖励。

| 检查 | 真实结果与边界 |
| --- | --- |
| npm run check | 34/34：25业务、6同步／清空、3注册；版本／语法／素材通过 |
| 清空单元 | revision不匹配拒绝，当前快照／dirty／inFlight／conflict清除，未登录和其他账号不变，不能清空guest，重新下载11XP不发奖 |
| Playwright UI | 设置中无账号入口；清空输入、取消确认、取消导出保留数据，成功备份包含最新外部写入的虚构评分；当前账号清空、退出／登录／注册切换、焦点、390px布局通过；认证传输模拟 |
| 源码Electron | 真实登录和同步11XP、云端v1；真实退出、备份文件保存、本机副本清空、会话文件与启动记忆清除；重新认证后云端快照及版本与清空前完全相同 |
| 最终打包EXE | 同上所有条件通过，设置入口移除；已查看最终截图 |
| 安装升级 | alpha.7→alpha.8、快捷方式、单实例、11XP／revision1／数据路径保持通过；隔离测试安装副本已卸载 |

账号清空smoke仅在--account-smoke且RATER_ACCOUNT_CLEAR_SMOKE=1时把导出保存到隔离userData/clear-account-backup.json；实际写文件，不模拟成功。正常应用仍弹出原生保存对话框。真实对话框完整鼠标路径、网络失败全路径／长期性能未重新验收；模拟UI取消不能替代Windows原生点击。

命令：$env:RATER_ACCOUNT_CLEAR_SMOKE='1'; node scripts/account-desktop-smoke.mjs 'release/win-unpacked/Rater & Tracker.exe'; Remove-Item Env:RATER_ACCOUNT_CLEAR_SMOKE。使用忽略的runtime-data/account-package和既有指定临时测试账号；没有删除云端账号或个人数据。原注册真实收码至完成仍待用户邮箱验收，旧测试账号清理授权未收到，不处理。

报告／截图在output/desktop/account、output/install、output/playwright，均忽略。安装包release/Rater-Tracker-0.1.0-alpha.8-Setup.exe，203,236,037字节，未签名；SHA256 E2427D3162E5C4346675CED41AB47D8B051589F012607840AB9C6D9A96C0644F。
