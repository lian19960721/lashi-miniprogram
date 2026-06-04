# 拉屎记 · 微信小程序版 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把现有 React/TanStack Web 版「💩 拉屎记」重写为微信原生小程序，并用微信云开发（云数据库 + 云存储）替换 localStorage，实现按用户隔离的多端同步。

**Architecture:** 微信原生小程序（WXML/WXSS/JS）。两个页面（首页 index、我的 me）；纯函数工具层 `utils/poop.js`（可用 node:test 单测）；数据访问层 `utils/store.js` 封装云数据库读写 + 本地缓存；图表用官方 ec-canvas + ECharts；用户识别依赖云数据库「仅创建者可读写」权限自动按 `_openid` 隔离。

**Tech Stack:** 微信原生小程序、微信云开发（云数据库 / 云存储）、ECharts（ec-canvas）、Node 内置 test runner（仅测纯函数）。

**前置说明（实现完成后由用户配置，非本计划步骤）：**
- 已注册小程序 AppID 填入 `project.config.json`
- 微信开发者工具开通云开发，建集合 `poop_records`、`poop_profile`，权限设「仅创建者可读写」
- `miniprogram/app.js` 中填云环境 ID

---

## 文件结构

```
lashi-miniprogram/
├── package.json                       # 仅用于 node:test 跑纯函数测试
├── project.config.json                # 小程序项目配置（appid 占位）
├── .gitignore
├── miniprogram/
│   ├── app.js                         # wx.cloud.init
│   ├── app.json                       # pages / tabBar / window
│   ├── app.wxss                       # 全局样式 + 颜色变量
│   ├── utils/
│   │   ├── poop.js                    # 数据常量 + 纯工具函数
│   │   ├── poop.test.js               # poop.js 单测（node:test）
│   │   └── store.js                   # 云数据库 + 缓存数据访问层
│   ├── pages/
│   │   ├── index/ index.{js,wxml,wxss,json}
│   │   └── me/ me.{js,wxml,wxss,json}
│   ├── components/ec-canvas/          # 官方 ECharts 组件（vendored）
│   │   └── ec-canvas.{js,wxml,wxss,json} + wx-canvas.js
│   ├── lib/echarts.js                 # ECharts 定制构建包（下载获得）
│   └── images/                        # tabBar 图标占位 png
└── docs/superpowers/...               # 设计文档 + 本计划
```

---

### Task 1: 项目骨架与配置

**Files:**
- Create: `package.json`
- Create: `.gitignore`
- Create: `project.config.json`
- Create: `miniprogram/app.js`
- Create: `miniprogram/app.json`
- Create: `miniprogram/app.wxss`

- [ ] **Step 1: 创建 `package.json`**

```json
{
  "name": "lashi-miniprogram",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "test": "node --test"
  }
}
```

- [ ] **Step 2: 创建 `.gitignore`**

```
node_modules/
miniprogram_npm/
.DS_Store
project.private.config.json
```

- [ ] **Step 3: 创建 `project.config.json`**

```json
{
  "miniprogramRoot": "miniprogram/",
  "cloudfunctionRoot": "cloudfunctions/",
  "appid": "YOUR_APPID_HERE",
  "projectname": "lashi-miniprogram",
  "setting": {
    "es6": true,
    "enhance": true,
    "postcss": true,
    "minified": true
  },
  "compileType": "miniprogram",
  "libVersion": "latest"
}
```

> 注：`appid` 由用户替换为自己的已注册 AppID。

- [ ] **Step 4: 创建 `miniprogram/app.js`**

```js
App({
  onLaunch() {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
      return;
    }
    wx.cloud.init({
      // 用户需替换为自己的云环境 ID
      env: 'YOUR_CLOUD_ENV_ID',
      traceUser: true,
    });
  },
  globalData: {},
});
```

- [ ] **Step 5: 创建 `miniprogram/app.json`**

```json
{
  "pages": ["pages/index/index", "pages/me/me"],
  "window": {
    "navigationBarTitleText": "拉屎记",
    "navigationBarBackgroundColor": "#fdf6ec",
    "navigationBarTextStyle": "black",
    "backgroundColor": "#fdf6ec"
  },
  "tabBar": {
    "color": "#9a8c7a",
    "selectedColor": "#c8862b",
    "backgroundColor": "#ffffff",
    "borderStyle": "white",
    "list": [
      {
        "pagePath": "pages/index/index",
        "text": "首页",
        "iconPath": "images/home.png",
        "selectedIconPath": "images/home-active.png"
      },
      {
        "pagePath": "pages/me/me",
        "text": "我的",
        "iconPath": "images/me.png",
        "selectedIconPath": "images/me-active.png"
      }
    ]
  },
  "sitemapLocation": "sitemap.json",
  "style": "v2"
}
```

> tabBar 图标在 Task 7 放占位 png；在此之前编译会报图标缺失警告，属预期。

- [ ] **Step 6: 创建 `miniprogram/app.wxss`**

```css
page {
  --bg: #fdf6ec;
  --card: #ffffff;
  --foreground: #2b2018;
  --muted: #9a8c7a;
  --primary: #c8862b;
  --destructive: #d8553a;
  --border: #ece2d4;
  background: var(--bg);
  color: var(--foreground);
  font-family: -apple-system, "PingFang SC", sans-serif;
}

.container {
  max-width: 750rpx;
  margin: 0 auto;
  padding-bottom: 160rpx;
  box-sizing: border-box;
}

.card {
  background: var(--card);
  border-radius: 28rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);
}
```

- [ ] **Step 7: Commit**

```bash
git add package.json .gitignore project.config.json miniprogram/app.js miniprogram/app.json miniprogram/app.wxss
git commit -m "chore: scaffold mini program project and cloud init"
```

---

### Task 2: 工具函数 `utils/poop.js`（TDD）

**Files:**
- Create: `miniprogram/utils/poop.test.js`
- Create: `miniprogram/utils/poop.js`

- [ ] **Step 1: 写失败测试 `miniprogram/utils/poop.test.js`**

```js
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
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `npm test`
Expected: FAIL，提示 `Cannot find module './poop'`。

- [ ] **Step 3: 实现 `miniprogram/utils/poop.js`**

```js
const FEELINGS = ['正常', '喷射', '便秘', '腹泻', '不尽'];

const FEELING_EMOJI = {
  正常: '😌',
  喷射: '🚀',
  便秘: '😣',
  腹泻: '💦',
  不尽: '😮‍💨',
};

const FEELING_COLOR = {
  正常: '#3FB562',
  喷射: '#E08A2B',
  便秘: '#B5663F',
  腹泻: '#3F9FE0',
  不尽: '#8B7FB5',
};

function pad(n) {
  return String(n).padStart(2, '0');
}

function formatDuration(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${pad(m)}:${pad(s)}`;
}

function humanDuration(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s} 秒`;
  if (s === 0) return `${m} 分`;
  return `${m} 分 ${s} 秒`;
}

function timeAgo(ts) {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return `${diff} 秒前`;
  if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`;
  return `${Math.floor(diff / 86400)} 天前`;
}

function formatDateTime(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatClock(ts) {
  const d = new Date(ts);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

module.exports = {
  FEELINGS,
  FEELING_EMOJI,
  FEELING_COLOR,
  formatDuration,
  humanDuration,
  timeAgo,
  formatDateTime,
  formatClock,
};
```

- [ ] **Step 4: 运行测试，确认通过**

Run: `npm test`
Expected: PASS，7 个测试全绿。

- [ ] **Step 5: Commit**

```bash
git add miniprogram/utils/poop.js miniprogram/utils/poop.test.js
git commit -m "feat: add poop utils with unit tests"
```

---

### Task 3: 数据访问层 `utils/store.js`

无法在 node 下单测（依赖 `wx` 全局），用「编译 + 字段约定一致性」验证；运行验证在 Task 8。

**Files:**
- Create: `miniprogram/utils/store.js`

- [ ] **Step 1: 实现 `miniprogram/utils/store.js`**

```js
const RECORDS = 'poop_records';
const PROFILE = 'poop_profile';
const CACHE_RECORDS = 'poop:records:cache';
const CACHE_PROFILE = 'poop:profile:cache';

function db() {
  return wx.cloud.database();
}

// ---- 本地缓存 ----
function getCachedRecords() {
  return wx.getStorageSync(CACHE_RECORDS) || [];
}
function setCachedRecords(list) {
  wx.setStorageSync(CACHE_RECORDS, list);
}
function getCachedProfile() {
  return wx.getStorageSync(CACHE_PROFILE) || null;
}
function setCachedProfile(p) {
  wx.setStorageSync(CACHE_PROFILE, p);
}

// ---- 记录 ----
async function fetchRecords() {
  const res = await db().collection(RECORDS).orderBy('endAt', 'desc').limit(100).get();
  setCachedRecords(res.data);
  return res.data;
}

async function addRecord(rec) {
  const res = await db().collection(RECORDS).add({ data: rec });
  const saved = Object.assign({ _id: res._id }, rec);
  setCachedRecords([saved].concat(getCachedRecords()));
  return saved;
}

async function removeRecord(id) {
  await db().collection(RECORDS).doc(id).remove();
  const list = getCachedRecords().filter((r) => r._id !== id);
  setCachedRecords(list);
  return list;
}

// ---- 用户资料 ----
async function fetchProfile() {
  const res = await db().collection(PROFILE).limit(1).get();
  const profile = res.data[0] || null;
  if (profile) setCachedProfile(profile);
  return profile;
}

async function upsertProfile(patch) {
  const res = await db().collection(PROFILE).limit(1).get();
  const existing = res.data[0];
  if (existing) {
    await db().collection(PROFILE).doc(existing._id).update({ data: patch });
    const merged = Object.assign({}, existing, patch);
    setCachedProfile(merged);
    return merged;
  }
  const added = await db().collection(PROFILE).add({ data: patch });
  const merged = Object.assign({ _id: added._id }, patch);
  setCachedProfile(merged);
  return merged;
}

// ---- 头像上传云存储 ----
async function uploadAvatar(filePath) {
  const m = filePath.match(/\.(\w+)$/);
  const ext = m ? m[1] : 'jpg';
  const cloudPath = `avatars/${Date.now()}-${Math.floor(Math.random() * 1e6)}.${ext}`;
  const res = await wx.cloud.uploadFile({ cloudPath, filePath });
  return res.fileID;
}

module.exports = {
  getCachedRecords,
  setCachedRecords,
  getCachedProfile,
  setCachedProfile,
  fetchRecords,
  addRecord,
  removeRecord,
  fetchProfile,
  upsertProfile,
  uploadAvatar,
};
```

- [ ] **Step 2: Commit**

```bash
git add miniprogram/utils/store.js
git commit -m "feat: add cloud database + cache data layer"
```

---

### Task 4: 首页 `pages/index`

**Files:**
- Create: `miniprogram/pages/index/index.js`
- Create: `miniprogram/pages/index/index.json`
- Create: `miniprogram/pages/index/index.wxml`
- Create: `miniprogram/pages/index/index.wxss`

- [ ] **Step 1: 创建 `index.json`**

```json
{
  "navigationBarTitleText": "拉屎记",
  "usingComponents": {}
}
```

- [ ] **Step 2: 创建 `index.js`**

```js
const poop = require('../../utils/poop');
const store = require('../../utils/store');

Page({
  data: {
    active: null,
    elapsedText: '00:00',
    startTimeText: '',
    todayCount: 0,
    lastAgo: '暂无记录',
    pickerOpen: false,
    pendingEnd: null,
    pendingDurText: '',
    feelingItems: [],
  },

  _timer: null,

  onLoad() {
    const feelingItems = poop.FEELINGS.map((f) => ({ name: f, emoji: poop.FEELING_EMOJI[f] }));
    const active = wx.getStorageSync('poop:active') || null;
    this.setData({ feelingItems, active });
    if (active) {
      this.setData({ startTimeText: poop.formatClock(active.startAt) });
      this._startTimer();
    }
    this._renderStats(store.getCachedRecords());
  },

  onShow() {
    this._renderStats(store.getCachedRecords());
    store
      .fetchRecords()
      .then((list) => this._renderStats(list))
      .catch(() => {});
  },

  onUnload() {
    this._clearTimer();
  },

  _renderStats(records) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const todayCount = records.filter((r) => r.endAt >= start.getTime()).length;
    const last = records[0];
    this.setData({
      todayCount,
      lastAgo: last ? poop.timeAgo(last.endAt) : '暂无记录',
    });
  },

  _startTimer() {
    this._clearTimer();
    const tick = () => {
      const active = this.data.active;
      if (!active) return;
      const elapsed = Math.max(0, Math.floor((Date.now() - active.startAt) / 1000));
      this.setData({ elapsedText: poop.formatDuration(elapsed) });
    };
    tick();
    this._timer = setInterval(tick, 1000);
  },

  _clearTimer() {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
  },

  onMainTap() {
    if (this.data.active) this._handleEnd();
    else this._handleStart();
  },

  _handleStart() {
    const active = { startAt: Date.now() };
    wx.setStorageSync('poop:active', active);
    this.setData({ active, startTimeText: poop.formatClock(active.startAt) });
    this._startTimer();
  },

  _handleEnd() {
    const active = this.data.active;
    if (!active) return;
    const pendingEnd = { startAt: active.startAt, endAt: Date.now() };
    const dur = Math.max(1, Math.floor((pendingEnd.endAt - pendingEnd.startAt) / 1000));
    this._clearTimer();
    this.setData({ pickerOpen: true, pendingEnd, pendingDurText: poop.humanDuration(dur) });
  },

  closePicker() {
    this.setData({ pickerOpen: false });
  },

  async onPickFeeling(e) {
    const feeling = e.currentTarget.dataset.feeling;
    const pendingEnd = this.data.pendingEnd;
    if (!pendingEnd) return;
    const duration = Math.max(1, Math.floor((pendingEnd.endAt - pendingEnd.startAt) / 1000));
    const rec = { startAt: pendingEnd.startAt, endAt: pendingEnd.endAt, duration, feeling };
    wx.showLoading({ title: '保存中', mask: true });
    try {
      await store.addRecord(rec);
      wx.removeStorageSync('poop:active');
      this.setData({
        active: null,
        pickerOpen: false,
        pendingEnd: null,
        elapsedText: '00:00',
      });
      this._renderStats(store.getCachedRecords());
      wx.hideLoading();
      wx.showToast({ title: `用时 ${poop.humanDuration(duration)}`, icon: 'none' });
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '保存失败', icon: 'none' });
    }
  },
});
```

- [ ] **Step 3: 创建 `index.wxml`**

```xml
<view class="container index">
  <view class="header">
    <view class="title">💩 拉屎记</view>
    <view class="subtitle">认真对待每一次释放</view>
  </view>

  <view class="stats">
    <view class="card stat">
      <view class="stat-label">今日次数</view>
      <view class="stat-value">{{todayCount}} 次</view>
    </view>
    <view class="card stat">
      <view class="stat-label">上次距今</view>
      <view class="stat-value">{{lastAgo}}</view>
    </view>
  </view>

  <view class="main">
    <view class="big-btn {{active ? 'big-btn--active' : ''}}" bindtap="onMainTap" hover-class="big-btn--hover">
      <view class="big-emoji">{{active ? '⏱️' : '💩'}}</view>
      <block wx:if="{{active}}">
        <view class="big-timer">{{elapsedText}}</view>
        <view class="big-hint">点击结束拉屎</view>
      </block>
      <view wx:else class="big-label">开始拉屎</view>
    </view>
    <view wx:if="{{active}}" class="start-time">开始于 {{startTimeText}}</view>
  </view>

  <view wx:if="{{pickerOpen}}" class="mask" bindtap="closePicker">
    <view class="picker" catchtap="noop">
      <view class="picker-title">这次感觉如何？</view>
      <view class="picker-sub">用时 {{pendingDurText}}</view>
      <view class="picker-grid">
        <view
          wx:for="{{feelingItems}}"
          wx:key="name"
          class="picker-item"
          data-feeling="{{item.name}}"
          bindtap="onPickFeeling"
          hover-class="picker-item--hover"
        >
          <view class="picker-emoji">{{item.emoji}}</view>
          <view class="picker-name">{{item.name}}</view>
        </view>
      </view>
    </view>
  </view>
</view>
```

- [ ] **Step 4: 创建 `index.wxss`**

```css
.header {
  text-align: center;
  padding-top: 64rpx;
}
.title {
  font-size: 48rpx;
  font-weight: 700;
}
.subtitle {
  margin-top: 8rpx;
  font-size: 26rpx;
  color: var(--muted);
}

.stats {
  display: flex;
  gap: 20rpx;
  padding: 48rpx 40rpx 0;
}
.stat {
  flex: 1;
  padding: 28rpx;
}
.stat-label {
  font-size: 24rpx;
  color: var(--muted);
}
.stat-value {
  margin-top: 8rpx;
  font-size: 36rpx;
  font-weight: 600;
}

.main {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 80rpx 0;
}
.big-btn {
  width: 440rpx;
  height: 440rpx;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #fff;
  box-shadow: 0 20rpx 50rpx rgba(0, 0, 0, 0.18);
  background: linear-gradient(145deg, #c8862b, #8a5a17);
}
.big-btn--active {
  background: linear-gradient(145deg, #d8553a, #9c3a26);
  animation: pulse 1.4s infinite;
}
.big-btn--hover {
  transform: scale(0.96);
}
@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.82;
  }
}
.big-emoji {
  font-size: 110rpx;
}
.big-timer {
  margin-top: 16rpx;
  font-size: 64rpx;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.big-hint {
  margin-top: 8rpx;
  font-size: 26rpx;
  opacity: 0.9;
}
.big-label {
  margin-top: 20rpx;
  font-size: 40rpx;
  font-weight: 600;
}
.start-time {
  margin-top: 40rpx;
  font-size: 22rpx;
  color: var(--muted);
}

.mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}
.picker {
  width: 560rpx;
  background: var(--card);
  border-radius: 40rpx;
  padding: 48rpx 40rpx;
}
.picker-title {
  text-align: center;
  font-size: 38rpx;
  font-weight: 600;
}
.picker-sub {
  text-align: center;
  margin-top: 8rpx;
  font-size: 26rpx;
  color: var(--muted);
}
.picker-grid {
  margin-top: 32rpx;
  display: flex;
  flex-wrap: wrap;
  gap: 24rpx;
}
.picker-item {
  width: calc(50% - 12rpx);
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  padding: 32rpx 0;
  border: 2rpx solid var(--border);
  border-radius: 28rpx;
  background: var(--card);
}
.picker-item--hover {
  background: #f6ede0;
}
.picker-emoji {
  font-size: 56rpx;
}
.picker-name {
  font-size: 28rpx;
  font-weight: 500;
}
```

- [ ] **Step 5: 在 `index.js` 补一个空 `noop` 防穿透**

在 `Page({ ... })` 的方法里加：

```js
  noop() {},
```

（放在 `closePicker` 之后即可，配合 wxml 里 `catchtap="noop"` 阻止点穿。）

- [ ] **Step 6: Commit**

```bash
git add miniprogram/pages/index
git commit -m "feat: home page with timer and feeling picker"
```

---

### Task 5: ec-canvas 组件与 ECharts 库（vendored）

ec-canvas 是官方组件，echarts.js 为外部构建产物，需下载。

**Files:**
- Create: `miniprogram/components/ec-canvas/ec-canvas.js`
- Create: `miniprogram/components/ec-canvas/ec-canvas.json`
- Create: `miniprogram/components/ec-canvas/ec-canvas.wxml`
- Create: `miniprogram/components/ec-canvas/ec-canvas.wxss`
- Create: `miniprogram/components/ec-canvas/wx-canvas.js`
- Create: `miniprogram/lib/echarts.js`（下载）

- [ ] **Step 1: 获取 echarts.js**

从官方仓库 `https://github.com/ecomfe/echarts-for-weixin`（目录 `ec-canvas/echarts.js`）下载该文件，或从 `https://echarts.apache.org/zh/builder.html` 勾选「折线/柱状图、饼图」生成精简版，保存为 `miniprogram/lib/echarts.js`。

验证：文件存在且非空。
Run: `node -e "console.log(require('fs').statSync('miniprogram/lib/echarts.js').size > 10000)"`
Expected: 打印 `true`。

- [ ] **Step 2: 创建 `ec-canvas.json`**

```json
{
  "component": true,
  "usingComponents": {}
}
```

- [ ] **Step 3: 创建 `ec-canvas.wxml`**

```xml
<canvas type="2d" class="ec-canvas" id="{{canvasId}}" bindinit="init" bindtouchstart="touchStart" bindtouchmove="touchMove" bindtouchend="touchEnd"></canvas>
```

- [ ] **Step 4: 创建 `ec-canvas.wxss`**

```css
.ec-canvas {
  width: 100%;
  height: 100%;
}
```

- [ ] **Step 5: 创建 `wx-canvas.js`**

使用官方 `echarts-for-weixin` 仓库中的 `ec-canvas/wx-canvas.js` 原文件（适配 2d canvas）。该文件实现 `WxCanvas` 类，包装小程序 canvas 上下文供 echarts 调用。直接复制官方版本，不做改动。

- [ ] **Step 6: 创建 `ec-canvas.js`**

使用官方 `echarts-for-weixin` 仓库中的 `ec-canvas/ec-canvas.js` 原文件。该组件暴露 `properties: { canvasId, ec }`，在 `ready` 时按 `ec.lazyLoad` 决定是否立即初始化，并提供 `init` 回调把 `canvas + echarts` 交给页面的 `ec.onInit(canvas, width, height, dpr)`。直接复制官方版本，不做改动。

> 说明：Task 6 的 me 页将用 `lazyLoad` 模式（拿到数据后再 `init`）。

- [ ] **Step 7: 编译验证**

在微信开发者工具中编译，确认 ec-canvas 组件无语法报错（暂未被页面引用，仅验证组件本身可编译）。

- [ ] **Step 8: Commit**

```bash
git add miniprogram/components/ec-canvas miniprogram/lib/echarts.js
git commit -m "chore: vendor ec-canvas component and echarts build"
```

---

### Task 6: 我的页 `pages/me`

**Files:**
- Create: `miniprogram/pages/me/me.js`
- Create: `miniprogram/pages/me/me.json`
- Create: `miniprogram/pages/me/me.wxml`
- Create: `miniprogram/pages/me/me.wxss`

- [ ] **Step 1: 创建 `me.json`**

```json
{
  "navigationBarTitleText": "我的",
  "usingComponents": {
    "ec-canvas": "../../components/ec-canvas/ec-canvas"
  }
}
```

- [ ] **Step 2: 创建 `me.js`**

```js
const poop = require('../../utils/poop');
const store = require('../../utils/store');
const echarts = require('../../lib/echarts');

const DEFAULT_NICKNAME = '拉屎大师';

Page({
  data: {
    avatarUrl: '',
    nickname: DEFAULT_NICKNAME,
    stats: { total: 0, totalDurText: '—', avgText: '—', maxMinText: '—' },
    records: [],
    hasRecords: false,
    pieEc: { lazyLoad: true },
    barEc: { lazyLoad: true },
  },

  _pieChart: null,
  _barChart: null,

  onLoad() {
    const profile = store.getCachedProfile();
    if (profile) {
      this.setData({
        avatarUrl: profile.avatarFileID || '',
        nickname: profile.nickname || DEFAULT_NICKNAME,
      });
    }
    this._render(store.getCachedRecords());
  },

  onShow() {
    this._render(store.getCachedRecords());
    store
      .fetchRecords()
      .then((list) => this._render(list))
      .catch(() => {});
    store
      .fetchProfile()
      .then((p) => {
        if (p) {
          this.setData({
            avatarUrl: p.avatarFileID || '',
            nickname: p.nickname || DEFAULT_NICKNAME,
          });
        }
      })
      .catch(() => {});
  },

  _render(records) {
    const list = records.map((r) => ({
      _id: r._id,
      feeling: r.feeling,
      emoji: poop.FEELING_EMOJI[r.feeling],
      color: poop.FEELING_COLOR[r.feeling],
      durText: poop.humanDuration(r.duration),
      dateText: poop.formatDateTime(r.endAt),
    }));

    let stats = { total: 0, totalDurText: '—', avgText: '—', maxMinText: '—' };
    if (records.length) {
      const durs = records.map((r) => r.duration);
      const totalDur = durs.reduce((a, b) => a + b, 0);
      const avg = Math.round(totalDur / records.length);
      stats = {
        total: records.length,
        totalDurText: poop.humanDuration(totalDur),
        avgText: poop.humanDuration(avg),
        maxMinText: `${poop.humanDuration(Math.max.apply(null, durs))} / ${poop.humanDuration(Math.min.apply(null, durs))}`,
      };
    }

    this.setData({ records: list, hasRecords: records.length > 0, stats });
    this._renderCharts(records);
  },

  _renderCharts(records) {
    if (!records.length) return;
    this._initPie(records);
    this._initBar(records);
  },

  _initPie(records) {
    const counts = {};
    poop.FEELINGS.forEach((f) => (counts[f] = 0));
    records.forEach((r) => (counts[r.feeling] = (counts[r.feeling] || 0) + 1));
    const data = poop.FEELINGS.filter((f) => counts[f] > 0).map((f) => ({
      name: f,
      value: counts[f],
      itemStyle: { color: poop.FEELING_COLOR[f] },
    }));

    this.selectComponent('#pie-chart').init((canvas, width, height, dpr) => {
      const chart = echarts.init(canvas, null, { width, height, devicePixelRatio: dpr });
      chart.setOption({
        tooltip: { trigger: 'item' },
        legend: { bottom: 0, textStyle: { fontSize: 10 } },
        series: [
          {
            type: 'pie',
            radius: ['40%', '68%'],
            center: ['50%', '42%'],
            label: { show: false },
            data: data,
          },
        ],
      });
      this._pieChart = chart;
      canvas.setChart(chart);
      return chart;
    });
  },

  _initBar(records) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      days.push({ label: `${d.getMonth() + 1}/${d.getDate()}`, ts: d.getTime(), count: 0 });
    }
    records.forEach((r) => {
      const d = new Date(r.endAt);
      d.setHours(0, 0, 0, 0);
      const found = days.find((x) => x.ts === d.getTime());
      if (found) found.count++;
    });

    this.selectComponent('#bar-chart').init((canvas, width, height, dpr) => {
      const chart = echarts.init(canvas, null, { width, height, devicePixelRatio: dpr });
      chart.setOption({
        grid: { top: 16, right: 8, bottom: 24, left: 24 },
        tooltip: { trigger: 'axis' },
        xAxis: {
          type: 'category',
          data: days.map((d) => d.label),
          axisTick: { show: false },
          axisLine: { show: false },
          axisLabel: { fontSize: 9, interval: 1, color: '#9a8c7a' },
        },
        yAxis: { type: 'value', minInterval: 1, axisLine: { show: false }, splitLine: { lineStyle: { color: '#ece2d4' } } },
        series: [{ type: 'bar', data: days.map((d) => d.count), itemStyle: { color: '#c8862b', borderRadius: [6, 6, 0, 0] } }],
      });
      this._barChart = chart;
      canvas.setChart(chart);
      return chart;
    });
  },

  async onChooseAvatar(e) {
    const filePath = e.detail.avatarUrl;
    if (!filePath) return;
    wx.showLoading({ title: '上传中', mask: true });
    try {
      const fileID = await store.uploadAvatar(filePath);
      await store.upsertProfile({ avatarFileID: fileID, nickname: this.data.nickname });
      this.setData({ avatarUrl: fileID });
      wx.hideLoading();
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '上传失败', icon: 'none' });
    }
  },

  onNicknameInput(e) {
    this.setData({ nickname: e.detail.value });
  },

  async onNicknameBlur(e) {
    const v = (e.detail.value || '').trim() || DEFAULT_NICKNAME;
    this.setData({ nickname: v });
    try {
      await store.upsertProfile({ nickname: v, avatarFileID: this.data.avatarUrl });
    } catch (err) {
      wx.showToast({ title: '保存失败', icon: 'none' });
    }
  },

  onDelete(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '删除这条记录？',
      content: '删除后无法恢复。',
      confirmColor: '#d8553a',
      success: async (res) => {
        if (!res.confirm) return;
        try {
          const list = await store.removeRecord(id);
          this._render(list);
        } catch (err) {
          wx.showToast({ title: '删除失败', icon: 'none' });
        }
      },
    });
  },
});
```

- [ ] **Step 3: 创建 `me.wxml`**

```xml
<view class="container me">
  <view class="profile">
    <button class="avatar-btn" open-type="chooseAvatar" bindchooseavatar="onChooseAvatar">
      <image wx:if="{{avatarUrl}}" class="avatar-img" src="{{avatarUrl}}" mode="aspectFill"></image>
      <view wx:else class="avatar-placeholder">💩</view>
      <view class="avatar-cam">📷</view>
    </button>
    <input
      class="nickname-input"
      type="nickname"
      value="{{nickname}}"
      placeholder="拉屎大师"
      maxlength="16"
      bindinput="onNicknameInput"
      bindblur="onNicknameBlur"
    />
  </view>

  <view class="stat-grid">
    <view class="card stat-block">
      <view class="stat-label">总次数</view>
      <view class="stat-value">{{stats.total}} <text class="unit">次</text></view>
    </view>
    <view class="card stat-block">
      <view class="stat-label">总时长</view>
      <view class="stat-value">{{stats.totalDurText}}</view>
    </view>
    <view class="card stat-block">
      <view class="stat-label">平均时长</view>
      <view class="stat-value">{{stats.avgText}}</view>
    </view>
    <view class="card stat-block">
      <view class="stat-label">最长 / 最短</view>
      <view class="stat-value small">{{stats.maxMinText}}</view>
    </view>
  </view>

  <block wx:if="{{hasRecords}}">
    <view class="card chart-card">
      <view class="chart-title">感受分布</view>
      <view class="chart-box">
        <ec-canvas id="pie-chart" canvas-id="pie-canvas" ec="{{ pieEc }}"></ec-canvas>
      </view>
    </view>

    <view class="card chart-card">
      <view class="chart-title">近 14 天频率</view>
      <view class="chart-box">
        <ec-canvas id="bar-chart" canvas-id="bar-canvas" ec="{{ barEc }}"></ec-canvas>
      </view>
    </view>
  </block>

  <view class="history">
    <view class="chart-title">历史记录</view>
    <view wx:if="{{!hasRecords}}" class="card empty">还没有记录，去首页开始第一次吧 💩</view>
    <view wx:else class="history-list">
      <view wx:for="{{records}}" wx:key="_id" class="card history-item">
        <view class="hi-emoji" style="background: {{item.color}}33;">{{item.emoji}}</view>
        <view class="hi-main">
          <view class="hi-top">
            <text class="hi-dur">{{item.durText}}</text>
            <text class="hi-tag" style="background: {{item.color}};">{{item.feeling}}</text>
          </view>
          <view class="hi-date">{{item.dateText}}</view>
        </view>
        <view class="hi-del" data-id="{{item._id}}" bindtap="onDelete">🗑️</view>
      </view>
    </view>
  </view>
</view>
```

- [ ] **Step 4: 创建 `me.wxss`**

```css
.profile {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 56rpx;
}
.avatar-btn {
  position: relative;
  width: 160rpx;
  height: 160rpx;
  border-radius: 50%;
  padding: 0;
  background: #f0e6d6;
  border: 6rpx solid #fff;
  box-shadow: 0 6rpx 18rpx rgba(0, 0, 0, 0.08);
  overflow: hidden;
  line-height: normal;
}
.avatar-btn::after {
  border: none;
}
.avatar-img {
  width: 100%;
  height: 100%;
}
.avatar-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 64rpx;
}
.avatar-cam {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 44rpx;
  height: 44rpx;
  background: var(--primary);
  border-radius: 50%;
  font-size: 22rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.nickname-input {
  margin-top: 20rpx;
  text-align: center;
  font-size: 36rpx;
  font-weight: 600;
  min-height: 56rpx;
}

.stat-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 20rpx;
  padding: 40rpx 32rpx 0;
}
.stat-block {
  width: calc(50% - 10rpx);
  box-sizing: border-box;
  padding: 28rpx;
}
.stat-label {
  font-size: 24rpx;
  color: var(--muted);
}
.stat-value {
  margin-top: 8rpx;
  font-size: 34rpx;
  font-weight: 600;
}
.stat-value.small {
  font-size: 26rpx;
}
.unit {
  font-size: 22rpx;
  color: var(--muted);
}

.chart-card {
  margin: 28rpx 32rpx 0;
  padding: 28rpx;
}
.chart-title {
  font-size: 28rpx;
  font-weight: 600;
  margin-bottom: 16rpx;
}
.chart-box {
  width: 100%;
  height: 360rpx;
}

.history {
  padding: 40rpx 32rpx 0;
}
.empty {
  padding: 64rpx;
  text-align: center;
  font-size: 26rpx;
  color: var(--muted);
}
.history-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.history-item {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 24rpx;
}
.hi-emoji {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36rpx;
  flex-shrink: 0;
}
.hi-main {
  flex: 1;
  min-width: 0;
}
.hi-top {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.hi-dur {
  font-size: 28rpx;
  font-weight: 500;
}
.hi-tag {
  color: #fff;
  font-size: 20rpx;
  padding: 2rpx 12rpx;
  border-radius: 999rpx;
}
.hi-date {
  margin-top: 6rpx;
  font-size: 22rpx;
  color: var(--muted);
}
.hi-del {
  padding: 12rpx;
  font-size: 32rpx;
  color: var(--muted);
}
```

- [ ] **Step 5: Commit**

```bash
git add miniprogram/pages/me
git commit -m "feat: me page with stats, charts, avatar/nickname, history"
```

---

### Task 7: tabBar 图标占位 + sitemap

**Files:**
- Create: `miniprogram/images/home.png`、`home-active.png`、`me.png`、`me-active.png`
- Create: `miniprogram/sitemap.json`

- [ ] **Step 1: 放置占位图标**

放入 4 张 81x81 px 的 png 图标（可先用任意纯色/简单图形占位）。最简方式：用微信开发者工具新建项目自带的 tabBar 图标，或从任意图标库导出。文件名严格对应 `app.json` 中路径：`home.png` / `home-active.png` / `me.png` / `me-active.png`。

验证：`miniprogram/images/` 下存在以上 4 个文件。

- [ ] **Step 2: 创建 `sitemap.json`**

```json
{
  "rules": [
    {
      "action": "allow",
      "page": "*"
    }
  ]
}
```

- [ ] **Step 3: Commit**

```bash
git add miniprogram/images miniprogram/sitemap.json
git commit -m "chore: add tabbar icons and sitemap"
```

---

### Task 8: 微信开发者工具集成验证（手动）

无自动化测试可覆盖小程序运行时，按以下清单在微信开发者工具中手动验证。

- [ ] **Step 1: 配置**

- `project.config.json` 填入真实 AppID。
- 开发者工具「云开发」控制台开通，新建集合 `poop_records`、`poop_profile`，二者权限均设「仅创建者可读写」。
- `miniprogram/app.js` 填入云环境 ID。

- [ ] **Step 2: 编译**

点击编译，确认控制台无 error（图标/库缺失警告应已消除）。

- [ ] **Step 3: 打卡流程**

首页点大按钮 → 显示 ⏱️ 与递增秒表 → 再点 → 弹「这次感觉如何？」→ 选一个感受 → toast「用时 …」，今日次数 +1，上次距今更新。云开发控制台 `poop_records` 出现新文档且带 `_openid`。

- [ ] **Step 4: 计时持久化**

计时中杀掉小程序重进首页，计时仍在继续（来自 `poop:active` 本地态）。

- [ ] **Step 5: 我的页**

切到「我的」：4 张统计卡数值正确；感受分布饼图、近 14 天柱状图正常渲染；历史列表展示记录。

- [ ] **Step 6: 头像 / 昵称**

点头像 → 选微信头像 → 上传后头像更新；改昵称失焦后保存。云开发 `poop_profile` 有对应文档；云存储 `avatars/` 下有头像文件。

- [ ] **Step 7: 删除**

历史项点删除 → 弹确认 → 确认后该项消失，`poop_records` 对应文档被删。

- [ ] **Step 8: 多端同步**

另一台设备/清缓存后用同一微信登录，数据仍在（验证云同步）。

- [ ] **Step 9: 跑纯函数测试**

Run: `npm test`
Expected: PASS。

- [ ] **Step 10: Commit（如有微调）**

```bash
git add -A
git commit -m "test: verify mini program end-to-end in devtools"
```

---

## Self-Review（作者自查）

**Spec 覆盖：**
- 数据模型两集合/字段 → Task 3 字段约定 + Task 8 建库验证 ✓
- 静默 openid 隔离 → 依赖云库权限，Task 8 Step 1 ✓
- 首页计时打卡 + 感受面板 → Task 4 ✓
- 今日次数/上次距今 → Task 4 `_renderStats` ✓
- 我的页统计 4 卡 → Task 6 `_render` ✓
- 饼图 + 14 天柱状图（ECharts）→ Task 5 + Task 6 ✓
- 头像（chooseAvatar+云存储）/昵称 → Task 6 ✓
- 历史 + 删除二次确认 → Task 6 `onDelete` ✓
- tabBar 首页/我的 → Task 1 app.json + Task 7 图标 ✓
- 本地缓存策略 → Task 3 + 各页 onShow ✓
- 工具函数移植 → Task 2（含 5 单测） ✓
- oklch→hex → Task 2 FEELING_COLOR ✓

**占位符扫描：** 仅 `appid` 与 `env` 为用户必填配置（spec 第 9 节已声明），非计划缺口；其余步骤均含完整代码。echarts.js / ec-canvas 官方文件为外部产物，Task 5 给出明确获取来源与验证。

**类型/命名一致性：** `store` 方法名（fetchRecords/addRecord/removeRecord/fetchProfile/upsertProfile/uploadAvatar/getCachedRecords/getCachedProfile）在 index.js、me.js 中调用一致；记录字段 `startAt/endAt/duration/feeling/_id` 全程一致；profile 字段 `nickname/avatarFileID` 一致；ec-canvas `id`/`init` 用法与组件接口一致。
