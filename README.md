# Daily Briefing Bot

Automated daily morning briefing delivered to Telegram at **6:00 AM ET** every day.

Runs entirely on **Google Apps Script** — no server, no hosting costs.

## What You Get Every Morning

| File | Contents |
|---|---|
| World News PDF | 2-page AI-written summary of top world headlines |
| Market Briefing PDF | 2-page market snapshot with index levels, movers, and today's watchlist |
| Morning Podcast (MP3) | 4–6 minute audio combining both summaries, read by a neural TTS voice |

All three are sent directly to your Telegram. PDFs and audio open natively on iPhone.

## Architecture

```
Google Apps Script (free, runs in Google cloud)
  ├── NewsService.js      → GNews API (world headlines)
  ├── MarketService.js    → Alpha Vantage (index quotes + market news)
  ├── Summarizer.js       → Gemini 2.0 Flash (AI summaries)
  ├── PdfGenerator.js     → Google Docs → PDF (no external deps)
  ├── PodcastGenerator.js → Google Cloud TTS Neural2 (MP3 audio)
  └── TelegramService.js  → Telegram Bot API (delivery)
```

Triggered at 6 AM ET daily via Apps Script time-based trigger.

## Cost

All services used have free tiers that cover 1 run/day:

| Service | Free Tier | Daily Usage |
|---|---|---|
| Google Apps Script | Unlimited | ~90s runtime |
| Gemini 2.0 Flash | 1,500 req/day | 2 req |
| GNews API | 100 req/day | 1 req |
| Alpha Vantage | 25 req/day | ~8 req |
| Google Cloud TTS | 1M Neural2 chars/month | ~3,000 chars |
| Telegram Bot API | Unlimited | 4 messages |

**Total monthly cost: $0**

## Setup

See [docs/setup.md](docs/setup.md) for the full step-by-step setup guide.

**Quick summary:**
1. Get 4 free API keys (Gemini, GNews, Alpha Vantage, Google Cloud TTS)
2. Set up a Telegram bot
3. `npm install -g @google/clasp && clasp login`
4. `clasp create --title "Daily Briefing Bot" --type standalone`
5. `clasp push`
6. Set Script Properties (API keys) in Apps Script UI
7. Run `setupTrigger()` once

## File Structure

```
daily-briefing-bot/
├── appsscript.json         Apps Script manifest (scopes, timezone)
├── .clasp.json             clasp project link (scriptId)
├── .gitignore              excludes .clasprc.json (OAuth token)
├── src/
│   ├── Config.js           API key management via Script Properties
│   ├── Main.js             Orchestrator + trigger setup
│   ├── NewsService.js      World news fetching
│   ├── MarketService.js    Market data fetching
│   ├── Summarizer.js       Gemini AI summarization
│   ├── PdfGenerator.js     Google Docs → PDF export
│   ├── PodcastGenerator.js Google TTS → MP3
│   └── TelegramService.js  Telegram delivery
└── docs/
    └── setup.md            Full setup guide
```

## Customization

- **Voice:** Change `en-US-Neural2-D` to `en-US-Neural2-F` in `PodcastGenerator.js` for female voice
- **Time:** Change `.atHour(6)` in `Main.js` for a different trigger hour
- **Symbols:** Add more ETF symbols to `MarketService.SYMBOLS`
- **Summary length:** Adjust `maxOutputTokens` in `Summarizer.js`
