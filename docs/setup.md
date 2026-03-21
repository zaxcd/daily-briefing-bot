# Daily Briefing Bot — Setup Guide

Complete this one-time setup before the bot can run. Takes about 20 minutes.

---

## Prerequisites

- A Google account (for Apps Script + Google Docs + TTS)
- Node.js installed (for `clasp` CLI)
- A Telegram account + existing bot (or create a new one below)

---

## Step 1 — Get API Keys

You need 4 API keys. All have free tiers sufficient for daily use.

### 1a. Gemini API Key (AI summarization)
1. Go to https://aistudio.google.com/apikey
2. Click **Create API key**
3. Copy the key → save as `GEMINI_API_KEY`
- Free: 1,500 requests/day, 15 req/min

### 1b. GNews API Key (world news)
1. Go to https://gnews.io
2. Sign up → Dashboard → copy your API key
3. Save as `GNEWS_API_KEY`
- Free: 100 requests/day (more than enough for 1/day)

### 1c. Alpha Vantage Key (market data)
1. Go to https://www.alphavantage.co/support/#api-key
2. Enter your email → copy the key
3. Save as `ALPHA_VANTAGE_KEY`
- Free: 25 requests/day (we use ~8/day)

### 1d. Google Cloud TTS Key (podcast audio)
1. Go to https://console.cloud.google.com
2. Create a new project (or use existing)
3. Search for **Text-to-Speech API** → Enable it
4. Go to **APIs & Services → Credentials → Create Credentials → API key**
5. (Optional but recommended) Restrict key to Cloud Text-to-Speech API only
6. Save as `GOOGLE_TTS_API_KEY`
- Free: 1 million Neural2 characters/month (~30 briefings = ~90K chars)

---

## Step 2 — Telegram Bot

If you already have a bot token from the GEX dashboard, you can reuse it.

**To create a new bot:**
1. Open Telegram → search `@BotFather`
2. Send `/newbot` → follow prompts → copy the token
3. Save as `TELEGRAM_BOT_TOKEN`

**To get your Chat ID:**
1. Start a chat with your bot (send it any message)
2. Visit: `https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates`
3. Find `"chat":{"id":XXXXXXXX}` in the response
4. Save as `TELEGRAM_CHAT_ID`

---

## Step 3 — Install clasp and Create Apps Script Project

```bash
# Install clasp globally
npm install -g @google/clasp

# Log in to your Google account
clasp login

# Create the Apps Script project (run from the repo root)
clasp create --title "Daily Briefing Bot" --type standalone

# This creates a new script and writes the scriptId to .clasp.json
```

After running `clasp create`, open `.clasp.json` and confirm the `scriptId` was written.

---

## Step 4 — Push Code to Apps Script

```bash
# From the repo root:
clasp push
```

This uploads all files in `src/` to your Apps Script project.

---

## Step 5 — Set Script Properties (API Keys)

**Option A: via Apps Script UI (recommended)**
1. Open the script: `clasp open`
2. Click **Project Settings** (gear icon, left sidebar)
3. Scroll to **Script Properties** → **Add property**
4. Add each key:

| Property | Value |
|---|---|
| `GEMINI_API_KEY` | your key |
| `GNEWS_API_KEY` | your key |
| `ALPHA_VANTAGE_KEY` | your key |
| `GOOGLE_TTS_API_KEY` | your key |
| `TELEGRAM_BOT_TOKEN` | your bot token |
| `TELEGRAM_CHAT_ID` | your chat id (number) |

**Option B: via `setupProperties()` function**
1. Open `src/Config.js` → replace placeholder values with real keys
2. In Apps Script editor: Run → `setupProperties`
3. Immediately delete the key values from `Config.js` and push again

---

## Step 6 — Authorize the Script

1. In the Apps Script editor, run `verifyConfig`
2. Google will prompt you to authorize the script (allow Google Docs, Drive, and external requests)
3. After authorization, `verifyConfig` should log "Config OK"

---

## Step 7 — Install the Daily Trigger

1. In Apps Script editor, run `setupTrigger`
2. Confirm in the **Triggers** panel (clock icon, left sidebar) that a trigger exists:
   - Function: `runDailyBriefing`
   - Runs: Day timer, 6 AM – 7 AM

---

## Step 8 — Test End-to-End

**Quick test (no Telegram send):**
1. Run `testRunWithoutSending` from Apps Script editor
2. Check the Execution Log for errors

**Full test:**
1. Run `runDailyBriefing` directly from the editor
2. Check Telegram — you should receive:
   - A text announcement
   - World News PDF
   - Market Briefing PDF
   - Morning Briefing MP3 podcast

---

## Step 9 — Push to GitHub

```bash
cd c:/Users/sures/Trading/daily-briefing-bot
git init
git add .
git commit -m "feat: initial daily briefing bot implementation"

# Create repo on GitHub (requires gh CLI or manual creation)
gh repo create daily-briefing-bot --public --source=. --push
# OR: create manually at https://github.com/new then:
git remote add origin https://github.com/YOUR_USERNAME/daily-briefing-bot.git
git push -u origin main
```

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| `Missing Script Properties` error | Re-run Step 5 |
| `Gemini API HTTP 400` | Check `GEMINI_API_KEY` is valid |
| `GNews API HTTP 429` | Hit free-tier limit — BBC RSS fallback will trigger automatically |
| `Alpha Vantage DEMO` response | Key not set or invalid |
| `Telegram HTTP 401` | `TELEGRAM_BOT_TOKEN` is wrong |
| `Telegram HTTP 400 Bad Request` | `TELEGRAM_CHAT_ID` is wrong or bot hasn't been started |
| No trigger fires | Run `setupTrigger` again; check Triggers panel |
| Audio is choppy | Increase `Utilities.sleep()` between TTS chunks in `PodcastGenerator.js` |

---

## Customization

**Change voice to female:**
In `src/PodcastGenerator.js`, change:
```js
name: 'en-US-Neural2-D'
```
to:
```js
name: 'en-US-Neural2-F'
```

**Change trigger time:**
In `src/Main.js`, change `.atHour(6)` to your preferred hour (0–23).

**Add more symbols to market data:**
In `src/MarketService.js`, add entries to the `SYMBOLS` object.

**Adjust AI summary length:**
In `src/Summarizer.js`, change `maxOutputTokens` (currently 1200) and the word-count instruction in the prompt.
