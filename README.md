# snip-cli

Zero-dependency Node.js CLI for the [Snip](https://github.com/yyleeSTE92/AISDLC-WorkShop1) URL shortener backend.

## Requirements

- Node.js 18+ (uses global `fetch`)
- A running Snip backend (see the `backend` branch)

## Quick start

```bash
# run directly
node cli.js help

# or install globally from this folder
npm install -g .
snip help
```

### Local wrappers (no install needed)

| Platform      | Command             |
| ------------- | ------------------- |
| macOS / Linux | `./snip <args>`     |
| Windows cmd   | `snip.cmd <args>`   |
| PowerShell    | `.\snip.ps1 <args>` |

## Commands

```
snip add <url>    Shorten a URL and print the short link
snip ls           List all shortened links
snip open <code>  Open the original URL for a short code in the browser
snip help         Show this help
```

## Environment

| Variable   | Default                 | Description           |
| ---------- | ----------------------- | --------------------- |
| `SNIP_API` | `http://localhost:3000` | Snip backend base URL |

```bash
SNIP_API=https://my-snip.railway.app snip ls
```
