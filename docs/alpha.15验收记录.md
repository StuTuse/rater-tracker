# alpha.15 · 全标签内容切换动画

2026-10-13，香港时间。应用alpha.15／产品v1.17／视觉v1.13，规则1.3／格式1保持。

## 已实现

原先入场仅分散在rating-card／task-card／panel等CSS，其他内容缺失；原位DOM复用也使原有节点不重播。新增src/page-motion.js，主页面切换明确播放独立内容组的上移淡入，覆盖组内全部可见文字、图像、控件。今日／任务／历史／奖励中心／设置一致，布局容器递归拆组，卡片与标题内子元素随组移动，避免父子多层透明度叠乘。

完整380ms／向上归位12px，22ms错峰且最大延迟132ms；柔和160ms纯淡入，关闭静态。使用独立translate与hover／press的transform共存。快速切换取消旧动画，隐藏取消；有限动画结束清标记与注册，不留行内位移或透明度。评分／保存／搜索／同标签重复点击不触发整页入场。

奖励中心四子页、任务五状态、徽章七系列筛选、历史7／30天趋势只动画变化内容区，共同标题／统计／菜单稳定；原位保存、草稿、光标、滚动沿用。顶部、侧栏和经验区保持稳定。

## 实际检查

- 最终npm run check40/40，语法／版本／51素材通过，业务与结算代码未改。
- scripts/pages-acceptance.cjs41/41：以真实事务构造未完成／完成／隐藏／归档任务与评分，实际鼠标切五页及所有页内标签。逐个可见文字／图像／控件确认被动画组覆盖；受控中间帧验证实际opacity和translate，任务卡／48徽章／四设置面板均入场，延迟有上限，落定无残留。
- 五状态、四奖励子页、七徽章筛选和趋势切换通过；共同标题／统计稳定，同标签／搜索／实际保存评分和参照不重播，快速切换旧动画取消、最新目标连接DOM，柔和／关闭／系统减少动态及390px无溢出通过。参照检查等待revision与真实保存文本，非只等旧保存状态文字。finally恢复隔离快照。
- scripts/ui-acceptance.cjs12/12：悬停／键盘、保存成功星星局部变化、原节点、备注／光标／展开／滚动、保存失败、连续点击、任务阶段保存保持推进草稿、设置草稿／关闭动效通过。
- scripts/controls-acceptance.cjs26/26：下拉、日期、模态内浮层、滑块、键盘、二级窗口进出、窄屏与减少动态通过。
- 额外模拟document.hidden并分发visibilitychange，实际进行中的page-enter全部取消、注册标记清理通过，随后恢复可见性。首次补查时专用浏览器已关闭，重开后通过；该检查不是实际Windows最小化或后台帧率测量。
- 最终alpha.15 EXE隔离smoke新增五页都有入场、实际上移和透明度、48徽章和四设置面板四条件通过；既有保存／资源／十阶段／账号草稿与关闭／勋章原图／有限礼花／无额外XP保持通过。
- 查看五页中间帧截图及桌面截图。中间帧为受控WAAPI时间，不声称60fps／GPU测量。浏览器任务列表含实际事务生成的不同状态，桌面默认smoke任务列表为空状态，不声称完整原生逐卡鼠标体验。

## 失败与修正

首次旧UI回归卡在等待任务阶段保存revision17，实际仍16。旧document.querySelector('[data-stage]')如今会先选到alpha.11加入的经验卡#growth，未点击任务checkbox；限定到.stage-row input[data-stage]后实际阶段保存／草稿回归12项全部通过。该修正仅属于验收脚本，未改任务阶段结算。

## 命令、产物与边界

```powershell
npm run check
# 先启动npm run dev，并在隔离浏览器open本地来源
node node_modules/@playwright/cli/playwright-cli.js -s=pages run-code --filename=scripts/pages-acceptance.cjs
node node_modules/@playwright/cli/playwright-cli.js -s=pages run-code --filename=scripts/ui-acceptance.cjs
node node_modules/@playwright/cli/playwright-cli.js -s=pages run-code --filename=scripts/controls-acceptance.cjs
node node_modules/electron-builder/cli.js --win nsis --x64 --publish never --config.electronDist=node_modules/electron/dist
node scripts/desktop-smoke.mjs 'release/win-unpacked/Rater & Tracker.exe'
```

安装包release/Rater-Tracker-0.1.0-alpha.15-Setup.exe，203,247,600字节，未签名；SHA256 `0F4ABDC7756A4E1DD2577E38095CB09DAADC6D5DE2CB474489E159BE3F4B3DB0`。

本轮未改core／storage／云端／认证／92句池或生图素材。未重测NSIS升级，最近仍alpha.11→alpha.12；未操作正常用户数据或云端账号。长期大列表性能／完整辅助功能／原生文件对话框与真实邮箱注册仍待后续。
