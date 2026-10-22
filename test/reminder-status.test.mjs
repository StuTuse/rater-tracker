import test from 'node:test';import assert from 'node:assert/strict';
import {nativeReminderStatus} from '../packages/ui/reminder-status.js';
test('native status distinguishes system submission from delivery and host availability',()=>{
 const html=nativeReminderStatus({serviceRunning:true,allowed:true,exact:true,channelImportance:3,lastStage:'test_posted'});
 assert.match(html,/常驻服务：运行中/);assert.match(html,/测试通知已提交系统/);assert.match(html,/横幅需在渠道设置开启/);assert.match(html,/完全关闭卓易通仍会中断服务/);assert.doesNotMatch(html,/已送达/);
});
test('native service errors render as text and failed start never displays running',()=>{
 const html=nativeReminderStatus({serviceRequested:true,serviceError:'<script>alert(1)</script>',lastStage:'post_failed'});
 assert.match(html,/尚未运行/);assert.match(html,/&lt;script&gt;/);assert.doesNotMatch(html,/<script>/);assert.match(html,/系统通知提交失败/);
});
