# GW2 TP Profit Helper

A web app that helps Guild Wars 2 players find profitable trading post opportunities using the official [Guild Wars 2 API](https://wiki.guildwars2.com/wiki/API:2).

## Features

- **Flip scanner** — scans live commerce prices for instant flip spreads
- **Item lookup** — search items and inspect buy/sell volume, spread, and fee-adjusted listing profit
- **Profit calculator** — compare instant flips vs listing flips with GW2's 5% listing fee and 10% sale tax
- **Account · My orders** — open buy/sell orders with undercut / outbid alerts vs live market
- **Account · Delivery** — coins and items waiting in your delivery box
- **Account · P&L history** — 90-day buy/sell summary with per-item net flow
- **Account · Crafting profit** — cheapest craft tree via gw2efficiency recipe engine, optional bank materials
- **Settings** — ArenaNet API key stored locally in your browser (never sent to this app's server)

### API key permissions

Create a key at [account.arena.net/applications](https://account.arena.net/applications):

| Permission | Used for |
|---|---|
| `account` | Required on all keys |
| `tradingpost` | Orders, delivery, transaction history |
| `inventories` | Subtract bank & material storage in crafting profit |

This uses the same ArenaNet API key as gw2efficiency — there is no separate gw2efficiency API.

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Disclaimer

This project is not affiliated with ArenaNet or NCSOFT. Market data comes from the public GW2 API and can lag real in-game prices.
