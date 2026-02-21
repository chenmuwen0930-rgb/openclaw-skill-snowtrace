// fetch_timeline.js — Playwright + Stealth 雪球数据抓取（绕过阿里云 WAF）
//
// 子命令:
//   node fetch_timeline.js timeline <user_id1,user_id2,...> [count]   获取大V动态
//   node fetch_timeline.js watchlist                                   获取当前用户自选股列表
//   node fetch_timeline.js watchlist_quotes                            获取自选股列表 + 实时行情
//
// 环境变量:
//   XQ_A_TOKEN (必须)  — 雪球 xq_a_token cookie 值
//   XQ_UID    (可选)   — 雪球用户 ID，不传则从 /user/show.json 自动获取
//
// 输出: JSON 到 stdout，日志到 stderr

const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
chromium.use(stealth);

const XQ_A_TOKEN = process.env.XQ_A_TOKEN;
if (!XQ_A_TOKEN) {
  console.error(JSON.stringify({ error: 'XQ_A_TOKEN environment variable not set' }));
  process.exit(1);
}

const subcommand = process.argv[2] || 'timeline';

async function createBrowser() {
  const browser = await chromium.launch({ headless: true });
  const uid = process.env.XQ_UID || '';
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 },
    locale: 'zh-CN',
    timezoneId: 'Asia/Shanghai',
  });
  const cookies = [
    { name: 'xq_a_token', value: XQ_A_TOKEN, domain: '.xueqiu.com', path: '/' },
    { name: 'xqat', value: XQ_A_TOKEN, domain: '.xueqiu.com', path: '/' },
    { name: 'xq_is_login', value: '1', domain: '.xueqiu.com', path: '/' },
  ];
  if (uid) {
    cookies.push({ name: 'u', value: uid, domain: '.xueqiu.com', path: '/' });
  }
  await context.addCookies(cookies);
  const page = await context.newPage();

  // 首页通过 WAF
  console.error('[xueqiu] visiting homepage to pass WAF...');
  await page.goto('https://xueqiu.com/', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(4000);
  console.error('[xueqiu] WAF session established');

  return { browser, context, page };
}

// ── timeline ──────────────────────────────────────────────
async function fetchTimeline() {
  const userIds = (process.argv[3] || '').split(',').filter(Boolean);
  const count = process.argv[4] || 5;
  if (userIds.length === 0) {
    console.error(JSON.stringify({ error: 'Usage: node fetch_timeline.js timeline <uid1,uid2,...> [count]' }));
    process.exit(1);
  }

  const { browser, page } = await createBrowser();
  const results = {};

  for (const userId of userIds) {
    const apiUrl = `https://xueqiu.com/v4/statuses/user_timeline.json?user_id=${userId}&type=10&count=${count}`;
    try {
      console.error(`[xueqiu] fetching timeline for ${userId}...`);
      await page.goto(apiUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.waitForTimeout(1500);

      const text = await page.evaluate(() => document.body.innerText);
      let data;
      try { data = JSON.parse(text); } catch {
        results[userId] = { error: 'non_json_response', preview: text.substring(0, 300) };
        continue;
      }

      if (data.statuses) {
        results[userId] = {
          statuses: data.statuses.map(s => ({
            id: s.id,
            user_id: s.user_id,
            title: s.title || '',
            text: (s.text || s.description || '').replace(/<[^>]*>/g, '').substring(0, 500),
            created_at: s.created_at,
            reply_count: s.reply_count || 0,
            retweet_count: s.retweet_count || 0,
            like_count: s.fav_count || s.like_count || 0,
          })),
          total: data.total || data.count || 0,
        };
      } else if (data.error_code || data.error_description) {
        results[userId] = { error: data.error_description || String(data.error_code) };
      } else {
        results[userId] = { error: 'unexpected_format', data };
      }
    } catch (err) {
      results[userId] = { error: err.message };
    }
    if (userIds.indexOf(userId) < userIds.length - 1) {
      await page.waitForTimeout(1500);
    }
  }

  console.log(JSON.stringify(results, null, 2));
  await browser.close();
}

// ── watchlist ─────────────────────────────────────────────
async function fetchWatchlist(withQuotes) {
  const { browser, page } = await createBrowser();

  try {
    // 获取自选股列表（通过 stock.xueqiu.com v5 API，在浏览器上下文内 fetch 以携带 cookie）
    console.error('[xueqiu] fetching watchlist...');
    const watchlistData = await page.evaluate(async () => {
      const r = await fetch('https://stock.xueqiu.com/v5/stock/portfolio/stock/list.json?pid=-1&category=1&size=200', { credentials: 'include' });
      return r.json();
    });

    if (watchlistData.error_code && watchlistData.error_code !== 0) {
      console.log(JSON.stringify({ error: watchlistData.error_description || String(watchlistData.error_code) }));
      await browser.close();
      return;
    }

    const stocks = (watchlistData.data && watchlistData.data.stocks) || [];
    console.error(`[xueqiu] found ${stocks.length} stocks in watchlist`);

    if (!withQuotes) {
      console.log(JSON.stringify({ stocks: stocks.map(s => ({ symbol: s.symbol, name: s.name, exchange: s.exchange, marketplace: s.marketplace })) }, null, 2));
      await browser.close();
      return;
    }

    // 批量获取行情（stock.xueqiu.com 支持逗号分隔的 symbol 列表）
    const symbols = stocks.map(s => s.symbol).join(',');
    console.error(`[xueqiu] fetching quotes for ${stocks.length} symbols...`);
    const quoteData = await page.evaluate(async (syms) => {
      const r = await fetch('https://stock.xueqiu.com/v5/stock/batch/quote.json?symbol=' + syms + '&extend=detail', { credentials: 'include' });
      return r.json();
    }, symbols);

    const quotes = (quoteData.data && quoteData.data.items) || [];
    const result = quotes.map(item => ({
      symbol: item.quote.symbol,
      name: item.quote.name,
      current: item.quote.current,
      percent: item.quote.percent,
      chg: item.quote.chg,
      high: item.quote.high,
      low: item.quote.low,
      last_close: item.quote.last_close,
      pe_ttm: item.quote.pe_ttm,
      pb: item.quote.pb,
      dividend_yield: item.quote.dividend_yield,
      market_capital: item.quote.market_capital,
      currency: item.quote.currency,
      exchange: item.quote.exchange,
    }));

    console.log(JSON.stringify({ stocks: result }, null, 2));
  } catch (err) {
    console.error(JSON.stringify({ error: err.message }));
    process.exit(1);
  } finally {
    await browser.close();
  }
}

// ── main ──────────────────────────────────────────────────
(async () => {
  switch (subcommand) {
    case 'timeline':
      await fetchTimeline();
      break;
    case 'watchlist':
      await fetchWatchlist(false);
      break;
    case 'watchlist_quotes':
      await fetchWatchlist(true);
      break;
    default:
      console.error(`Unknown subcommand: ${subcommand}. Use: timeline, watchlist, watchlist_quotes`);
      process.exit(1);
  }
})();
