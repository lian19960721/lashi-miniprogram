const test = require('node:test');
const assert = require('node:assert');
const poop = require('./poop');

test('FEELINGS 有 5 种感受', () => {
  assert.deepStrictEqual(poop.FEELINGS, ['正常', '喷射', '便秘', '腹泻', '不尽']);
});

test('每种感受都有 emoji 和颜色', () => {
  for (const f of poop.FEELINGS) {
    assert.ok(poop.FEELING_EMOJI[f], `${f} 缺 emoji`);
    assert.match(poop.FEELING_COLOR[f], /^#[0-9A-Fa-f]{6}$/, `${f} 颜色应为 hex`);
  }
});

test('formatDuration 补零成 mm:ss', () => {
  assert.strictEqual(poop.formatDuration(0), '00:00');
  assert.strictEqual(poop.formatDuration(65), '01:05');
  assert.strictEqual(poop.formatDuration(600), '10:00');
});

test('humanDuration 中文表述', () => {
  assert.strictEqual(poop.humanDuration(45), '45 秒');
  assert.strictEqual(poop.humanDuration(120), '2 分');
  assert.strictEqual(poop.humanDuration(125), '2 分 5 秒');
});

test('timeAgo 分级', () => {
  const now = Date.now();
  assert.strictEqual(poop.timeAgo(now - 10 * 1000), '10 秒前');
  assert.strictEqual(poop.timeAgo(now - 5 * 60 * 1000), '5 分钟前');
  assert.strictEqual(poop.timeAgo(now - 3 * 3600 * 1000), '3 小时前');
  assert.strictEqual(poop.timeAgo(now - 2 * 86400 * 1000), '2 天前');
});

test('formatDateTime 输出 YYYY-MM-DD HH:mm', () => {
  const ts = new Date(2026, 5, 4, 9, 7).getTime();
  assert.strictEqual(poop.formatDateTime(ts), '2026-06-04 09:07');
});

test('formatClock 输出 HH:mm:ss', () => {
  const ts = new Date(2026, 5, 4, 9, 7, 3).getTime();
  assert.strictEqual(poop.formatClock(ts), '09:07:03');
});
