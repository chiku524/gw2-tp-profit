# GW2 TP Profit Helper

A web app that helps Guild Wars 2 players find profitable trading post opportunities using the official [Guild Wars 2 API](https://wiki.guildwars2.com/wiki/API:2).

## Features

- **Flip scanner** — scans live commerce prices for instant flip spreads (buy from lowest sell, sell to highest buy)
- **Item lookup** — search any item and inspect buy/sell volume, spread, and fee-adjusted listing profit
- **Profit calculator** — compare instant flips vs listing flips with GW2's 5% listing fee and 10% sale tax

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
