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
 *
 * by 云间 · 云间AI手册
 * https://github.com/YunjianAI/claudian-tab-title-patch
 */

const fs = require('fs');
const path = require('path');
const VERSION = '1.0.0';

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

let js = fs.readFileSync(mainJs, 'utf8');
let css = fs.readFileSync(stylesCss, 'utf8');

// 已打过补丁检测
if (js.includes('claudian-tab-badge-expanded')) {
  console.log('ℹ️  已经打过补丁了，无需重复操作');
  console.log('   如需还原: node patch-claudian-tabs.js --undo "' + vaultPath + '"');
  process.exit(0);
}

// ============ 备份 ============
fs.copyFileSync(mainJs, mainJs + '.bak');
fs.copyFileSync(stylesCss, stylesCss + '.bak');
console.log('💾 已备份原始文件');

// ============ 统一行尾为 LF ============
const jsLF = js.replace(/\r\n/g, '\n');
const cssLF = css.replace(/\r\n/g, '\n');

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

if (!jsLF.includes(jsOld)) {
  console.error('❌ main.js 中未找到目标代码');
  console.error('   可能 Claudian 版本已更新，当前补丁不兼容');
  console.error('   已自动还原备份，插件不受影响');
  console.error('');
  console.error('   请到 GitHub 反馈: https://github.com/YunjianAI/claudian-tab-title-patch/issues');
  fs.copyFileSync(mainJs + '.bak', mainJs);
  fs.copyFileSync(stylesCss + '.bak', stylesCss);
  process.exit(1);
}

const jsPatched = jsLF.replace(jsOld, jsNew);
fs.writeFileSync(mainJs, jsPatched);
console.log('✅ main.js  — 活跃标签显示标题');

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

if (!cssLF.includes(cssOld)) {
  console.error('❌ styles.css 中未找到目标样式');
  console.error('   可能 Claudian 版本已更新，当前补丁不兼容');
  console.error('   已自动还原备份，插件不受影响');
  console.error('');
  console.error('   请到 GitHub 反馈: https://github.com/YunjianAI/claudian-tab-title-patch/issues');
  fs.copyFileSync(mainJs + '.bak', mainJs);
  fs.copyFileSync(stylesCss + '.bak', stylesCss);
  process.exit(1);
}

const cssPatched = cssLF.replace(cssOld, cssNew);
fs.writeFileSync(stylesCss, cssPatched);
console.log('✅ styles.css — 标签展开样式');

// ============ 完成 ============
console.log('');
console.log('🎉 补丁完成！重启 Obsidian 即可生效');
console.log('');
console.log('还原方法:');
console.log('  node patch-claudian-tabs.js --undo "' + vaultPath + '"');
console.log('');
console.log('注意: Claudian 插件更新后需重新运行此脚本');
