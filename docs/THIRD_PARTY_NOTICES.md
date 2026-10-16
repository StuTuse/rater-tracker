# 第三方组件与许可范围

2026-10-16。根[MIT LICENSE](../LICENSE)适用于TuseCreation在本项目中的原创贡献；第三方源码、运行时、依赖及其版权通知保留各自许可，不能因为根许可证改为MIT就将它们改署为TuseCreation。npm中的`private: true`仅阻止误发npm包，不代表GitHub私有或限制MIT授权。

## 本次实际核对的直接组件

下表来自当前已安装组件的package.json及现有文件，不是所有传递依赖／二进制的完整许可审计。

| 组件 | 当前版本／许可 | 用途及现有通知 |
| --- | --- | --- |
| Electron | 44.7.0／MIT，另含Chromium等上游许可 | Windows运行时；发行目录的LICENSE与LICENSES.chromium.html须保留 |
| electron-builder | 26.15.3／MIT | 构建工具；不将工具的许可冒充NSIS运行组件许可 |
| ws | 8.22.0／MIT | Windows运行依赖；保留其LICENSE |
| @cloudbase/js-sdk | 3.10.2／Apache-2.0 | 双端认证与云同步；[既有SDK许可](../apps/windows/electron/cloudbase-LICENSE.txt)，浏览器与Windows bundle末尾含Bundled license information |
| @capacitor/core | 8.5.3／MIT | Android Web／原生桥接；保留上游版权和许可 |
| @capacitor/android | 8.5.3／MIT | Android原生桥接；保留上游版权和许可 |

浏览器bundle与Windows bundle的通知块来自各自实际打包内容，不能互相替换或只保留一份。构建链继续按`cloud/build.mjs`的`legalComments: 'eof'`保留已有法律注释。本轮没有修改这些生成文件。

## 正式签名前仍需完成

- 针对最终Windows与Android包列出完整组件、传递依赖、原生运行库／媒体库及相应许可，核对通知是否实际随包交付。
- 核对NSIS编译器、installer stub、插件与辅助工具各自实际来源／许可，不能笼统认定整个NSIS构建产物都使用项目MIT。
- 核对Android的Gradle／Maven依赖及通知、云SDK传递依赖要求；根LICENSE不替代Apache等上游义务。
- 原创SVG与图像生成记录见[素材清单](../assets/generated/manifest.json)。MIT许可只授予维护者有权授予的权利；生成记录不能单独证明所有第三方权利均已核实。
- 接受签名服务前由服务方确认Electron衍生主程序的可签范围；不批量重签第三方DLL或辅助EXE。

本轮只增加许可和说明文档、申请样包工作流，未改已有安装包的许可文件布局，不声称完整审计已经通过。
