# 雪球 API 参考文档

## 认证机制

雪球没有官方公开 API，以下接口为社区逆向所得，基于 Cookie 认证。

### Token 获取

1. 浏览器打开 https://xueqiu.com/
2. 登录你的雪球账号
3. 按 F12 打开 DevTools
4. 切换到 Application（应用）标签页
5. 左侧选择 Cookies → `https://xueqiu.com`
6. 找到 `xq_a_token`，复制其值
7. 在终端中设置：`export XQ_A_TOKEN="复制的值"`

### Token 有效期

- Token 通常有效期较长（数周到数月）
- 如果退出登录或清除浏览器 Cookie，Token 会失效
- 失效后需重新登录并获取新 Token

### 请求头要求

所有 API 请求必须携带以下头：

```
Cookie: xq_a_token={token}
User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36
Referer: https://xueqiu.com/
```

---

## API 接口

### 1. 用户动态 (User Timeline)

获取指定用户的发帖列表。

**请求**

```
GET https://xueqiu.com/v4/statuses/user_timeline.json
```

**参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| user_id | string | 是 | 用户 ID，从个人主页 URL 获取：`xueqiu.com/u/{user_id}` |
| type | int | 否 | 帖子类型。`0`=全部（默认），`10`=仅原创，`11`=仅转发 |
| count | int | 否 | 每页条数，默认 10，最大 20 |
| page | int | 否 | 页码，从 1 开始，默认 1 |

**响应结构**

```json
{
  "statuses": [
    {
      "id": 123456789,
      "user_id": 1247347556,
      "title": "帖子标题（可能为空）",
      "text": "<p>帖子正文，包含 HTML 标签</p>",
      "description": "纯文本摘要",
      "target": "https://xueqiu.com/1247347556/123456789",
      "created_at": 1708416000000,
      "reply_count": 150,
      "retweet_count": 80,
      "like_count": 500,
      "view_count": 50000,
      "reward_count": 5,
      "retweeted_status": null,
      "user": {
        "id": 1247347556,
        "screen_name": "段永平",
        "followers_count": 1000000,
        "friends_count": 50,
        "status_count": 3000,
        "verified": true,
        "verified_description": "知名投资人"
      }
    }
  ],
  "total": 3000,
  "page": 1,
  "maxPage": 300
}
```

**字段说明**

- `text`: 帖子正文，包含 HTML 标签，需用 `gsub("<[^>]*>"; "")` 去除
- `created_at`: Unix 毫秒时间戳
- `retweeted_status`: 如果是转发，包含原帖对象；原创为 null
- `target`: 帖子的完整 URL

---

### 2. 股票实时行情 (Stock Quote)

批量获取股票实时行情。

**请求**

```
GET https://stock.xueqiu.com/v5/stock/quote.json
```

**参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| symbol | string | 是 | 股票代码，多个用逗号分隔，如 `SH600519,00700` |
| extend | string | 否 | `detail` 返回详细信息 |

**响应结构**

```json
{
  "data": {
    "items": [
      {
        "market": {
          "status_id": 5,
          "region": "CN",
          "status": "交易中",
          "time_zone": "Asia/Shanghai"
        },
        "quote": {
          "symbol": "SH600519",
          "code": "600519",
          "name": "贵州茅台",
          "exchange": "SH",
          "current": 1756.00,
          "percent": 1.25,
          "chg": 21.70,
          "open": 1740.00,
          "high": 1765.00,
          "low": 1735.00,
          "last_close": 1734.30,
          "volume": 2500000,
          "amount": 4380000000,
          "turnover_rate": 0.20,
          "market_capital": 2205000000000,
          "pe_ttm": 32.50,
          "pe_lyr": 33.10,
          "pb": 10.50,
          "eps": 54.03,
          "dividend_yield": 1.82,
          "total_shares": 1256200000,
          "float_shares": 1256200000,
          "currency": "CNY",
          "time": 1708416000000
        }
      }
    ],
    "items_size": 1
  },
  "error_code": 0,
  "error_description": ""
}
```

**关键字段**

| 字段 | 说明 |
|------|------|
| current | 最新价 |
| percent | 涨跌幅（百分比） |
| chg | 涨跌额 |
| open | 今开 |
| high | 最高 |
| low | 最低 |
| last_close | 昨收 |
| volume | 成交量（股） |
| amount | 成交额（元） |
| turnover_rate | 换手率 |
| market_capital | 总市值 |
| pe_ttm | 滚动市盈率 |
| pb | 市净率 |
| eps | 每股收益 |
| dividend_yield | 股息率 |

---

## 股票代码规范

### A 股

| 交易所 | 前缀 | 示例 | 说明 |
|--------|------|------|------|
| 上海证券交易所 | SH | SH600519 | 主板 60xxxx |
| 上海证券交易所 | SH | SH688001 | 科创板 688xxx |
| 深圳证券交易所 | SZ | SZ000001 | 主板 000xxx |
| 深圳证券交易所 | SZ | SZ002001 | 中小板 002xxx |
| 深圳证券交易所 | SZ | SZ300001 | 创业板 300xxx |
| 北京证券交易所 | BJ | BJ830799 | 北交所 8xxxxx |

### 港股

直接使用 5 位数字代码（不足 5 位前面补 0）：

| 示例 | 说明 |
|------|------|
| 00700 | 腾讯控股 |
| 09988 | 阿里巴巴-SW |
| 03690 | 美团-W |
| 01810 | 小米集团-W |
| 09618 | 京东集团-SW |

### 美股

直接使用股票代码字母：

| 示例 | 说明 |
|------|------|
| AAPL | 苹果 |
| BABA | 阿里巴巴 |
| PDD | 拼多多 |

---

## 常见错误码

| HTTP 状态码 | error_code | 含义 | 处理方式 |
|------------|------------|------|---------|
| 200 | 0 | 成功 | 正常处理 |
| 200 | 400 | 请求参数错误 | 检查参数格式 |
| 400 | - | 请求格式错误 | 检查 URL 和参数 |
| 401 | - | 未认证 | Token 缺失，需设置 |
| 403 | - | Token 过期或无效 | 重新获取 Token |
| 404 | - | 用户或资源不存在 | 检查 user_id 是否正确 |
| 429 | - | 请求频率过高 | 等待后重试，建议间隔 1-2 秒 |
| 500 | - | 服务器内部错误 | 稍后重试 |

### 典型错误响应

**Token 过期**
```json
{
  "error_description": "遇到错误，请刷新页面或者重新登录帐号后再试",
  "error_uri": "/v4/statuses/user_timeline.json",
  "error_code": "400",
  "error_data": null
}
```

**用户不存在**
```json
{
  "statuses": [],
  "total": 0,
  "page": 1,
  "maxPage": 0
}
```

---

## 帖子链接格式

雪球帖子的 URL 格式为：

```
https://xueqiu.com/{user_id}/{status_id}
```

例如：`https://xueqiu.com/1247347556/123456789`

---

## 频率限制建议

- 请求间隔建议 >= 1 秒
- 单次会话总请求数建议 <= 20 次
- 如遇 429 响应，等待 5-10 秒后重试
- 行情接口支持批量查询，尽量一次请求多个股票代码以减少请求次数

---

## 其他有用接口（备用）

### 搜索用户

```
GET https://xueqiu.com/search/user.json?q={关键词}&count=10&page=1
```

可用于帮用户查找大V的 user_id。

### 股票搜索

```
GET https://xueqiu.com/search/stock.json?q={关键词}&count=10&page=1
```

可用于模糊搜索股票代码。

### 个股讨论

```
GET https://xueqiu.com/query/v1/status/stock_timeline.json?symbol={symbol}&count=10&source=all
```

可用于查看某只股票的最新讨论。
