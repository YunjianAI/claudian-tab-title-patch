#!/usr/bin/env node
/**
 * Claudian Tab Title Patch
 * 让 Claudian 插件的当前活跃标签显示会话标题，告别纯数字编号
 *
 * 用法：
 *   node patch-claudian-tabs.js [vault-path]          # 应用补丁
 *   node patch-claudian-tabs.js --undo [vault-path]   # 还原到原始版本
 *
 * 说明：
 *   - 自动备份原始文件（.bak）
 *   - 支持重复运行（已打过补丁会跳过）
 *   - 插件更新后需重新运行
 *   - JS / CSS 两段补丁各自独立、幂等：插件更新若只覆盖了 main.js
 *     而保留了 styles.css（或反之），重跑也能正确补齐缺失的一侧，
 *     不会因为某一侧「已是补丁状态、找不到原始锚点」而误判不兼容、
 *     并连坐回滚另一侧已经打好的补丁。
 *
 * by 云间 · 云间AI手册
 * https://github.com/YunjianAI/claudian-tab-title-patch
 */

const fs = require('fs');
const path = require('path');
const VERSION = '1.0.1';

// ============ 参数解析 ============
const args = process.argv.slice(2);
const isUndo = args.includes('--undo');
const vaultPath = args.find(a => a !== '--undo') || process.cwd();
const pluginDir = path.join(vaultPath, '.obsidian', 'plugins', 'claudian');
const mainJs = path.join(pluginDir, 'main.js');
const stylesCss = path.join(pluginDir, 'styles.css');

// ============ 前置检查 ============
if (!fs.existsSync(mainJs)) {
  console.error('❌ 未找到 Claudian 插件');
  console.error('   检查路径: ' + pluginDir);
  console.error('   用法: node patch-claudian-tabs.js "你的库路径"');
  process.exit(1);
}

// ============ 还原模式 ============
if (isUndo) {
  const jsBak = mainJs + '.bak';
  const cssBak = stylesCss + '.bak';
  if (!fs.existsSync(jsBak) || !fs.existsSync(cssBak)) {
    console.error('❌ 未找到备份文件（.bak），无法还原');
    process.exit(1);
  }
  fs.copyFileSync(jsBak, mainJs);
  fs.copyFileSync(cssBak, stylesCss);
  console.log('✅ 已还原到原始版本');
  console.log('   重启 Obsidian 生效');
  process.exit(0);
}

// ============ 读取文件 ============
console.log('📦 Claudian Tab Title Patch v' + VERSION);
console.log('   库路径: ' + vaultPath);
console.log('');

const js = fs.readFileSync(mainJs, 'utf8');
const css = fs.readFileSync(stylesCss, 'utf8');

// ============ 统一行尾为 LF ============
const jsLF = js.replace(/\r\n/g, '\n');
const cssLF = css.replace(/\r\n/g, '\n');

// ============ 补丁标记（JS / CSS 各自独立判断）============
// 插件更新有时只覆盖 main.js 而保留 styles.css（或反之），两侧补丁状态
// 可能不同步，因此必须分别判断，不能用单一标记决定整体「打过 / 没打过」。
const jsAlreadyPatched = jsLF.includes('claudian-tab-badge-expanded');
const cssAlreadyPatched = cssLF.includes('claudian-tab-badge-expanded');

if (jsAlreadyPatched && cssAlreadyPatched) {
  console.log('ℹ️  已经打过补丁了，无需重复操作');
  console.log('   如需还原: node patch-claudian-tabs.js --undo "' + vaultPath + '"');
  process.exit(0);
}

// ============ JS 补丁：标签渲染逻辑 ============
const jsOld = [
  '    const badgeEl = this.containerEl.createDiv({',
  '      cls: `claudian-tab-badge ${stateClass}`,',
  '      text: String(item.index)',
  '    });',
  '    badgeEl.setAttribute("aria-label", item.title);',
  '    badgeEl.setAttribute("title", item.title);',
].join('\n');

const jsNew = [
  '    const isExpanded = item.isActive;',
  '    const displayText = isExpanded ? item.title : String(item.index);',
  '    const badgeEl = this.containerEl.createDiv({',
  '      cls: `claudian-tab-badge ${stateClass}${isExpanded ? " claudian-tab-badge-expanded" : ""}`',
  '    });',
  '    if (isExpanded) {',
  '      const indexSpan = badgeEl.createSpan({ cls: "claudian-tab-badge-index", text: String(item.index) });',
  '      const titleSpan = badgeEl.createSpan({ cls: "claudian-tab-badge-title", text: item.title });',
  '    } else {',
  '      badgeEl.setText(String(item.index));',
  '    }',
  '    badgeEl.setAttribute("aria-label", item.title);',
  '    badgeEl.setAttribute("title", item.title);',
].join('\n');

let jsOut = jsLF;
let jsChanged = false;
let jsSkipped = false;
if (jsAlreadyPatched) {
  jsSkipped = true;
} else if (!jsLF.includes(jsOld)) {
  console.error('❌ main.js 中未找到目标代码');
  console.error('   可能 Claudian 版本已更新，当前补丁不兼容');
  console.error('   未改动任何文件，插件不受影响');
  console.error('');
  console.error('   请到 GitHub 反馈: https://github.com/YunjianAI/claudian-tab-title-patch/issues');
  process.exit(1);
} else {
  jsOut = jsLF.replace(jsOld, jsNew);
  jsChanged = true;
}

// ============ CSS 补丁：展开样式 ============
const cssOld = [
  '  cursor: pointer;',
  '  color: var(--text-muted);',
  '  background: var(--background-primary);',
  '  transition: border-color 0.15s ease, color 0.15s ease, background 0.15s ease;',
  '}',
].join('\n');

const cssNew = [
  '  cursor: pointer;',
  '  color: var(--text-muted);',
  '  background: var(--background-primary);',
  '  transition: width 0.2s ease, border-color 0.15s ease, color 0.15s ease, background 0.15s ease;',
  '  flex-shrink: 0;',
  '}',
  '',
  '/* ---- Active tab expanded with title ---- */',
  '.claudian-tab-badge-expanded {',
  '  width: auto;',
  '  max-width: 180px;',
  '  padding: 0 8px;',
  '  gap: 5px;',
  '  border-radius: 6px;',
  '}',
  '',
  '.claudian-tab-badge-expanded .claudian-tab-badge-index {',
  '  flex-shrink: 0;',
  '  opacity: 0.5;',
  '  font-size: 11px;',
  '}',
  '',
  '.claudian-tab-badge-expanded .claudian-tab-badge-title {',
  '  overflow: hidden;',
  '  white-space: nowrap;',
  '  text-overflow: ellipsis;',
  '  font-size: 12px;',
  '}',
].join('\n');

let cssOut = cssLF;
let cssChanged = false;
let cssSkipped = false;
if (cssAlreadyPatched) {
  cssSkipped = true;
} else if (!cssLF.includes(cssOld)) {
  console.error('❌ styles.css 中未找到目标样式');
  console.error('   可能 Claudian 版本已更新，当前补丁不兼容');
  console.error('   未改动任何文件，插件不受影响');
  console.error('');
  console.error('   请到 GitHub 反馈: https://github.com/YunjianAI/claudian-tab-title-patch/issues');
  process.exit(1);
} else {
  cssOut = cssLF.replace(cssOld, cssNew);
  cssChanged = true;
}

// ============ 备份 + 写入 ============
// 走到这里说明两侧都 OK（patch 或已是补丁状态），不存在「写一半失败回滚」。
// 只备份真正会被改写的文件，避免覆盖掉已有的干净 .bak。
if (jsChanged) fs.copyFileSync(mainJs, mainJs + '.bak');
if (cssChanged) fs.copyFileSync(stylesCss, stylesCss + '.bak');
if (jsChanged || cssChanged) console.log('💾 已备份原始文件');

if (jsChanged) {
  fs.writeFileSync(mainJs, jsOut);
  console.log('✅ main.js  — 活跃标签显示标题');
} else if (jsSkipped) {
  console.log('ℹ️  main.js 已含标题逻辑，跳过');
}

if (cssChanged) {
  fs.writeFileSync(stylesCss, cssOut);
  console.log('✅ styles.css — 标签展开样式');
} else if (cssSkipped) {
  console.log('ℹ️  styles.css 已含展开样式，跳过');
}

// ============ 完成 ============
console.log('');
console.log('🎉 补丁完成！重启 Obsidian 即可生效');
console.log('');
console.log('还原方法:');
console.log('  node patch-claudian-tabs.js --undo "' + vaultPath + '"');
console.log('');
console.log('注意: Claudian 插件更新后需重新运行此脚本');
