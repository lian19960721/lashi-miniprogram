# 拉屎记 · 微信小程序版 设计文档

- 日期：2026-06-04
- 来源：将现有 React/TanStack Web 应用「💩 拉屎记」移植为微信原生小程序
- 原项目位置：`E:\AI_Projects\lovable-project-lashi\lovable-project-lashi`（保留不动，作参考）
- 新项目位置：`E:\AI_Projects\lashi-miniprogram\`

## 1. 目标与范围

将 Web 版功能 1:1 移植到微信原生小程序（WXML/WXSS/JS），并用**微信云开发**替换浏览器 localStorage，实现按用户隔离的云端多端同步。

**保留的功能（与原 Web 版一致）：**

- 首页计时打卡：开始 → 秒表计时 → 结束 → 选感受 → 生成记录
- 5 种感受：正常 😌 / 喷射 🚀 / 便秘 😣 / 腹泻 💦 / 不尽 😮‍💨（各带 emoji + 颜色）
- 首页统计卡：今日次数、上次距今
- 「我的」页：头像、昵称、4 张统计卡、感受分布饼图、近 14 天频率柱状图、历史列表 + 删除
- tabBar：首页 / 我的

**新增：** 数据云端同步（换设备、重装不丢）。

**明确不做（YAGNI）：** 不做显式登录页、不做社交分享、不做提醒推送、不做数据导出（可作后续迭代）。

## 2. 技术选型（已确认）

| 决策项 | 选择 |
|--------|------|
| 框架 | 微信原生小程序（WXML/WXSS/JS），不使用 Taro/uni-app |
| 数据存储 | 微信云数据库 + 本地缓存 |
| 用户识别 | 静默 openid，无登录页（依赖云数据库「仅创建者可读写」权限自动隔离） |
| 图表 | ECharts（官方 ec-canvas 组件） |
| 头像 | `button open-type="chooseAvatar"` 取微信头像，上传云存储存 fileID |
| 昵称 | `input type="nickname"` |

## 3. 目录结构

```
E:\AI_Projects\lashi-miniprogram\
├── project.config.json        # 项目配置，含 appid（占位，待用户填写）
├── project.private.config.json
├── miniprogram/
│   ├── app.js                 # wx.cloud.init 初始化云开发
│   ├── app.json               # 全局配置：pages、tabBar、window
│   ├── app.wxss               # 全局样式 + 颜色变量
│   ├── pages/
│   │   ├── index/             # 首页：index.js / .wxml / .wxss / .json
│   │   └── me/                # 我的：me.js / .wxml / .wxss / .json
│   ├── components/
│   │   └── ec-canvas/         # 官方 ECharts 组件（ec-canvas.js/.wxml/.wxss/.json）
│   ├── lib/
│   │   └── echarts.js         # ECharts 定制构建包
│   ├── utils/
│   │   ├── poop.js            # 数据模型常量 + 工具函数（移植自 poop.ts）
│   │   └── store.js           # 数据访问层：云数据库读写 + 本地缓存封装
│   └── images/                # tabBar 图标（占位 png）
├── cloudfunctions/            # 预留目录（本方案默认不需要云函数）
└── docs/superpowers/specs/    # 本设计文档
```

## 4. 数据模型

### 4.1 云数据库集合

两个集合，权限均设为 **「仅创建者可读写」**，微信自动按写入者的 `_openid` 做隔离与查询限制。

**集合 `poop_records`** —— 每条排便记录：

| 字段 | 类型 | 说明 |
|------|------|------|
| `_id` | string | 自动主键 |
| `_openid` | string | 自动写入，用户标识 |
| `startAt` | number | 开始时间戳（ms） |
| `endAt` | number | 结束时间戳（ms） |
| `duration` | number | 时长（秒），= max(1, floor((endAt-startAt)/1000)) |
| `feeling` | string | 五种感受之一 |

**集合 `poop_profile`** —— 每用户一条：

| 字段 | 类型 | 说明 |
|------|------|------|
| `_id` | string | 自动主键 |
| `_openid` | string | 自动写入 |
| `nickname` | string | 昵称，默认「拉屎大师」 |
| `avatarFileID` | string | 云存储 fileID，可空 |

### 4.2 本地（临时态 + 缓存）

- `poop:active` —— 进行中的计时会话 `{ startAt }`，仅存本地 `wx.setStorageSync`，不上云。
- `poop:records:cache` —— records 列表缓存，进页面先读它秒出，再用云数据拉取覆盖。
- `poop:profile:cache` —— profile 缓存。

## 5. 数据流与缓存策略

**读（onShow / onLoad）：**
1. 先 `wx.getStorageSync` 读缓存，立即 `setData` 渲染（秒出）。
2. 再 `db.collection(...).where(...).get()` 拉云数据，成功后 `setData` 覆盖并回写缓存。
3. 云请求失败：保留缓存内容，`wx.showToast` 轻提示「网络异常，显示本地数据」。

**写记录（结束打卡选感受后）：**
1. 组装记录对象，`db.collection('poop_records').add(...)`。
2. 成功后把返回的 `_id` 拼进记录，插入列表头部，`setData` + 回写缓存。
3. 清空 `poop:active`，`wx.showToast` 提示用时。

**删除记录：**
1. `wx.showModal` 二次确认。
2. `db.collection('poop_records').doc(id).remove()`，成功后从列表移除 + 回写缓存。

**头像：**
1. `chooseAvatar` 回调拿到临时路径 → `wx.cloud.uploadFile` 上传云存储得 fileID。
2. `poop_profile` upsert `avatarFileID`，`setData` 用 fileID（小程序 `<image src="cloud://...">` 可直接渲染）。

**昵称：** `input type="nickname"` 失焦/确认时 upsert `nickname`（空则回退「拉屎大师」）。

## 6. 工具函数（utils/poop.js，移植自 poop.ts）

- `FEELINGS`、`FEELING_EMOJI`、`FEELING_COLOR`（oklch 转等价 hex）
- `formatDuration(seconds)` → `mm:ss`
- `humanDuration(seconds)` → `X 分 Y 秒`
- `timeAgo(ts)` → `X 秒/分钟/小时/天前`
- `formatDateTime(ts)` → `YYYY-MM-DD HH:mm`

**oklch → hex 近似映射（实现时校准）：**

| 感受 | 原 oklch | 近似 hex |
|------|----------|----------|
| 正常 | oklch(0.72 0.15 145) | #3FB562 |
| 喷射 | oklch(0.7 0.18 50) | #E08A2B |
| 便秘 | oklch(0.6 0.13 30) | #B5663F |
| 腹泻 | oklch(0.7 0.14 220) | #3F9FE0 |
| 不尽 | oklch(0.65 0.08 280) | #8B7FB5 |

## 7. 页面交互细节

### 7.1 首页 index

- 顶部标题「💩 拉屎记 / 认真对待每一次释放」。
- 两张统计卡：今日次数（按当天 0 点过滤 records）、上次距今（最新记录 `timeAgo`，无则「暂无记录」）。
- 中间大圆按钮：
  - 未计时：💩 + 「开始拉屎」，暖色渐变。
  - 计时中：⏱️ + `mm:ss`（每秒 setData）+ 「点击结束拉屎」，红色脉冲动画（WXSS animation）。
- 结束后弹自定义感受面板（WXML 条件渲染的浮层，非系统弹窗）：标题「这次感觉如何？」+ 用时，2 列 5 个感受按钮。
- 选中即写库 + toast。

### 7.2 我的 me

- 头像区：`chooseAvatar` 按钮（无头像时显示 💩 占位），右下角相机角标；昵称行内编辑（nickname input + 铅笔图标）。
- 4 张统计卡：总次数、总时长、平均时长、最长/最短。
- records 非空时显示两图（用 ec-canvas）：
  - 感受分布**饼图**（按 FEELING_COLOR 着色，含图例）。
  - 近 14 天**柱状图**（X 轴日期、计数）。
- 历史列表：每项左侧感受 emoji 圆底色、中间时长 + 感受标签 + 日期、右侧删除按钮。
- records 为空：占位「还没有记录，去首页开始第一次吧 💩」。

### 7.3 tabBar

- 首页（index）、我的（me），各需选中/未选中两张图标 png，先放占位图标，用户可替换。

## 8. 样式方案

- 全部用 WXSS + rpx 重写；颜色用上表 hex。
- 全局卡片：圆角、浅色背景、轻阴影；暖色主色调。
- 容器最大宽度居中（模拟原 max-w-md），底部留出 tabBar 高度。

## 9. 用户需自行准备（实现后配置）

1. 已注册的小程序 **AppID**（云开发不支持测试号）→ 填入 `project.config.json`。
2. 微信开发者工具中**开通云开发**，新建集合 `poop_records`、`poop_profile`，权限设为「仅创建者可读写」。
3. 在 `app.js` 的 `wx.cloud.init({ env: '...' })` 中填**云环境 ID**。

## 10. 验收标准

- 在微信开发者工具中能编译运行，无报错。
- 打卡流程：开始计时 → 结束 → 选感受 → 记录入云数据库，首页今日次数 +1。
- 「我的」页统计与两张图表随数据正确变化。
- 头像、昵称可设置并持久化。
- 删除记录二次确认后从列表与云库移除。
- 杀进程重进、换设备登录同一微信，数据仍在（云同步生效）。

## 11. 风险与说明

- 这是**完整重写**（框架、语言、存储全换），非增量改动。
- ECharts 定制包体积较大，需从官方 ec-canvas 示例引入。
- 头像 `chooseAvatar` 返回临时文件，必须上传云存储才能跨设备同步。
- 云数据库权限「仅创建者可读写」是按用户隔离的关键，建库时务必正确设置。
