#!/bin/bash
# install.sh — 在 Docker 容器内安装 xueqiu-summary skill 的依赖
# 用法: cd /path/to/xueqiu-summary && bash install.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
echo "==> 安装目录: $SCRIPT_DIR"

# 检测包管理器
if command -v apt-get &>/dev/null; then
    PKG_MGR="apt"
elif command -v apk &>/dev/null; then
    PKG_MGR="apk"
elif command -v yum &>/dev/null; then
    PKG_MGR="yum"
else
    PKG_MGR="unknown"
fi
echo "==> 包管理器: $PKG_MGR"

# 1. 安装 Node.js（如果没有）
if ! command -v node &>/dev/null; then
    echo "==> 安装 Node.js..."
    if [ "$PKG_MGR" = "apt" ]; then
        apt-get update && apt-get install -y nodejs npm
    elif [ "$PKG_MGR" = "apk" ]; then
        apk add --no-cache nodejs npm
    elif [ "$PKG_MGR" = "yum" ]; then
        yum install -y nodejs npm
    else
        echo "ERROR: 无法自动安装 Node.js，请手动安装" && exit 1
    fi
fi
echo "==> Node $(node -v), npm $(npm -v)"

# 2. 安装 Playwright 系统依赖（Chromium 需要的共享库）
echo "==> 安装 Chromium 系统依赖..."
if [ "$PKG_MGR" = "apt" ]; then
    apt-get update && apt-get install -y --no-install-recommends \
        libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 \
        libcups2 libdrm2 libxkbcommon0 libxcomposite1 \
        libxdamage1 libxfixes3 libxrandr2 libgbm1 libpango-1.0-0 \
        libcairo2 libasound2 libatspi2.0-0 libwayland-client0 \
        fonts-noto-cjk \
        2>/dev/null || true
elif [ "$PKG_MGR" = "apk" ]; then
    apk add --no-cache \
        chromium nss freetype harfbuzz ca-certificates ttf-freefont \
        font-noto-cjk \
        2>/dev/null || true
fi

# 3. 安装 npm 包（在 skill 目录下本地安装）
echo "==> 安装 npm 依赖..."
cd "$SCRIPT_DIR"
[ ! -f package.json ] && npm init -y --silent
npm install --save playwright-extra puppeteer-extra-plugin-stealth 2>&1 | tail -3

# 4. 安装 Chromium 浏览器
echo "==> 下载 Chromium..."
npx playwright install chromium 2>&1 | tail -5

# Alpine 特殊处理：用系统 Chromium 代替 Playwright 下载的
if [ "$PKG_MGR" = "apk" ] && command -v chromium-browser &>/dev/null; then
    export PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=$(which chromium-browser)
    echo "==> Alpine: 使用系统 Chromium: $PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH"
fi

# 5. 验证
echo ""
echo "==> 验证安装..."
node -e "
const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
chromium.use(stealth);
console.log('  playwright-extra: OK');
console.log('  stealth plugin: OK');
(async () => {
  try {
    const browser = await chromium.launch({ headless: true });
    console.log('  Chromium launch: OK');
    await browser.close();
    console.log('');
    console.log('==> 全部就绪！');
  } catch(e) {
    console.error('  Chromium launch FAILED:', e.message.substring(0, 200));
    console.error('');
    console.error('  如果是 Alpine 容器，试试: export PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=\$(which chromium-browser)');
    process.exit(1);
  }
})();
"
