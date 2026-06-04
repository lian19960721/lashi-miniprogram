# 💩 拉屎记 · 微信小程序

记录每一次排便的时长与感受，云端多端同步。由原 React/TanStack Web 版重写为微信原生小程序（WXML/WXSS/JS）+ 微信云开发。

## 运行前你需要做 3 件事

1. **填 AppID**：把 `project.config.json` 里的 `"appid": "YOUR_APPID_HERE"` 改成你自己的已注册小程序 AppID（云开发不支持测试号）。
2. **开通云开发并建集合**：微信开发者工具 → 云开发 → 开通。新建两个集合，**权限均设为「仅创建者可读写」**：
   - `poop_records`（排便记录）
   - `poop_profile`（用户资料）
3. **填云环境 ID**：把 `miniprogram/app.js` 里的 `env: 'YOUR_CLOUD_ENV_ID'` 改成你的云环境 ID。

然后用微信开发者工具打开本项目根目录即可编译运行。

## 目录结构

```
miniprogram/
├── app.{js,json,wxss}              全局配置 + 云初始化 + 样式变量
├── pages/index/                    首页：计时打卡 + 感受面板
├── pages/me/                       我的：统计 + 饼图/柱状图 + 头像昵称 + 历史
├── components/ec-canvas/           ECharts 图表组件（含 echarts.js 构建包）
└── utils/
    ├── poop.js                     数据常量 + 工具函数（有单测）
    └── store.js                    云数据库 + 本地缓存数据层
```

## 测试

纯函数单测（无需微信环境）：

```bash
npm test
```

## 数据模型

| 集合 | 字段 |
|------|------|
| `poop_records` | `_openid`(自动) `startAt` `endAt` `duration`(秒) `feeling` |
| `poop_profile` | `_openid`(自动) `nickname` `avatarFileID` |

用户识别依赖云数据库「仅创建者可读写」权限按 `_openid` 自动隔离，无需登录页。

设计与实现文档见 `docs/superpowers/`。
