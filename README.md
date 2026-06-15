# GemJar

A match-3 puzzle game built for [Celo](https://celo.org) and [MiniPay](https://www.opera.com/products/minipay).

Match gems to earn points, compete for a daily stablecoin prize pool, and watch a slice of every win drop into your on-chain savings jar.

## Status

Early build - game core (board, matching, scoring, UI) is in progress. On-chain features (prize pool, savings jar, MiniPay wallet integration) are next.

## Tech stack

- [Next.js](https://nextjs.org) (App Router) + TypeScript
- [Tailwind CSS](https://tailwindcss.com)
- [Framer Motion](https://www.framer.com/motion/) for game animations
- [viem](https://viem.sh) for Celo chain interaction
- Deployed on [Celo](https://docs.celo.org) (Mainnet + Sepolia testnet)

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to play.

## Design goals

- Playable instantly as a guest, no wallet required
- Works as a standalone web app and inside the MiniPay wallet
- Mobile-first, optimized for low-end Android devices on slow connections
