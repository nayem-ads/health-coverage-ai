# Health Coverage AI

Health coverage calculator that estimates public marketplace plan options and lets visitors connect with a nearby certified agent.

## Run locally

```sh
npm install
npm run dev
```

## Production server

The production server serves the Vite build and proxies CMS Marketplace API requests.

```sh
npm run build
MARKETPLACE_API_KEY=your_key npm start
```

## Environment

```sh
MARKETPLACE_API_KEY=
```
