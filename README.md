# xueqiu-summary

[OpenClaw](https://openclaw.ai) Skill — snow大V动态汇总与投资建议

自动抓取snow大V最新发帖 + 用户自选股实时行情，给出汇总摘要和投资参考建议。

## 功能

- 抓取关注的snow大V最新原创动态（Playwright + stealth 绕过 WAF）
- 获取snow自选股列表及实时行情（支持 A 股 / 港股 / 美股）
- 可选配置本地持仓，自动计算盈亏
- 输出五段式投资分析报告（大V观点摘要 → 行情概览 → 关联分析 → 投资建议 → 免责声明）

## 安装

### 1. 放到 OpenClaw skills 目录

```bash
# 克隆到 OpenClaw workspace skills 目录
git clone https://github.com/YOUR_USERNAME/xueqiu-summary.git \
  ~/.openclaw/workspace/skills/xueqiu-summary
```

### 2. 安装依赖

```bash
cd ~/.openclaw/workspace/skills/xueqiu-summary
bash install.sh
```

或手动安装：

```bash
npm install
npx playwright install chromium
```

### 3. 设置snow Token

```bash
export XQ_A_TOKEN="your_xq_a_token_here"
```

获取方式：浏览器打开 [xueqiu.com](https://xueqiu.com) → 登录 → F12 → Application → Cookies → 复制 `xq_a_token` 值。

### 4. 配置关注列表

```bash
cp watchlist.example.json watchlist.json
# 编辑 watchlist.json，添加你关注的大V
```

可选 — 配置持仓（用于计算盈亏）：

```bash
cp portfolio.example.json portfolio.json
# 编辑 portfolio.json，填入你的持仓信息
```

如果不配置 `portfolio.json`，会自动从snow账号获取自选股列表。

## 使用

在 OpenClaw 对话中直接触发即可，agent 会自动识别该 skill 并执行数据抓取和分析。

也可以单独运行脚本：

```bash
# 获取大V动态
node fetch_timeline.js timeline "1247347556,5819606767" 5

# 获取自选股列表
node fetch_timeline.js watchlist

# 获取自选股 + 实时行情
node fetch_timeline.js watchlist_quotes
```

## 文件结构

```
xueqiu-summary/
├── SKILL.md                    # OpenClaw skill 定义（agent 读取此文件）
├── fetch_timeline.js           # 数据抓取脚本（Playwright + stealth）
├── install.sh                  # 一键安装依赖
├── package.json                # npm 依赖声明
├── watchlist.example.json      # 大V关注列表示例
├── portfolio.example.json      # 持仓配置示例
├── references/
│   └── api-reference.md        # 雪球 API 参考文档
├── LICENSE
└── README.md
```

## 技术说明

| 数据 | 接口 | 方式 | 原因 |
|------|------|------|------|
| 大V动态 | xueqiu.com | Playwright + stealth | 主域名有阿里云 WAF |
| 自选股列表 | stock.xueqiu.com | Playwright (browser fetch) | 需浏览器上下文携带 cookie |
| 单只股票行情 | stock.xueqiu.com | curl | 子域名无 WAF |

## 免责声明

本项目仅供学习和个人使用。雪球 API 为非官方接口，请遵守雪球的使用条款。投资有风险，AI 生成的分析内容不构成任何投资建议。

## License

MIT
