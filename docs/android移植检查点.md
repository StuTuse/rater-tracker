# Android 移植检查点

验收进行中，尚未宣称完成。Android apps/android；Windows apps/windows；共享 packages/core、data、ui。旧src和electron路径兼容。

构建：node scripts/android-build.mjs；JDK21／Android SDK。RATER_BUILD_PROXY仅用于本次构建。设备：node scripts/android-ui-acceptance.mjs ui|controls|pages|flow，隔离emulator-5556实际WebView。

输出release/android，本地签名runtime-data/android-signing必须保留，不纳入Git。详细实际结果和待完成项见WORKLOG W033。
