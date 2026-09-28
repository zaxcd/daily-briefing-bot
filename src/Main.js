// Main.js — Daily briefing orchestrator
// Triggered automatically at 6:00 AM ET every day.
// Run setupTrigger() once manually to install the trigger.

/**
 * Main entry point — called by the time-based trigger every morning.
 * Full pipeline: fetch → summarize → PDF → podcast → Telegram.
 */
function runDailyBriefing() {
  const cfg   = getConfig();
  const today = Utilities.formatDate(new Date(), 'America/New_York', 'MMMM d, yyyy');

  Logger.log('[DailyBriefing] Starting run for ' + today);

  try {
    // Step 1: Fetch raw data
    Logger.log('[1/6] Fetching world news (geopolitical, business, tech, AI, US, weather)...');
    const newsData = NewsService.fetchHeadlines(cfg.gnewsApiKey);
    Logger.log('  Geopolitical: ' + newsData.geopolitical.length +
               ' | Business/Tech: ' + newsData.businessTech.length +
               ' | AI: ' + newsData.aiNews.length +
               ' | US: ' + newsData.usNews.length +
               ' | Weather: ' + (newsData.weather ? newsData.weather.condition : 'N/A'));

    Logger.log('[2/6] Fetching market data (US, Mag7, futures, international, earnings)...');
    const marketData = MarketService.fetchSummary(cfg.alphaVantageKey);
    Logger.log('  US quotes: ' + Object.keys(marketData.quotes).join(', '));
    Logger.log('  Mag7: ' + Object.keys(marketData.mag7).join(', '));
    Logger.log('  Futures: ' + Object.keys(marketData.futures).join(', '));
    Logger.log('  International: ' + Object.keys(marketData.international).join(', '));
    Logger.log('  Earnings today: ' + (marketData.earnings.length > 0
      ? marketData.earnings.map(e => e.symbol).join(', ')
      : 'none'));

    // Step 2: AI summarization
    Logger.log('[3/6] Generating AI summaries (Gemini 4-page each)...');
    const newsSummary   = Summarizer.summarizeNews(newsData, today, cfg.geminiApiKey);
    const marketSummary = Summarizer.summarizeMarkets(marketData, today, cfg.geminiApiKey);
    Logger.log('  News summary: ' + newsSummary.length + ' chars');
    Logger.log('  Market summary: ' + marketSummary.length + ' chars');

    // Step 3: Generate PDFs
    Logger.log('[4/6] Generating PDFs...');
    const newsPdf    = PdfGenerator.create(newsSummary, 'World News Briefing', today);
    const marketsPdf = PdfGenerator.create(marketSummary, 'Market Briefing', today);
    Logger.log('  PDFs created');

    // Step 4: Generate podcast audio
    Logger.log('[5/6] Generating podcast audio (Google TTS)...');
    const podcastAudio = PodcastGenerator.create(newsSummary, marketSummary, today, cfg.googleTtsApiKey);
    Logger.log('  Audio size: ' + podcastAudio.getBytes().length + ' bytes');

    // Step 5: Send to Telegram
    Logger.log('[6/6] Sending to Telegram...');
    TelegramService.sendBriefing(newsPdf, marketsPdf, podcastAudio, today, cfg.telegramBotToken, cfg.telegramChatId);

    Logger.log('[DailyBriefing] Complete for ' + today);

  } catch (e) {
    Logger.log('[DailyBriefing] ERROR: ' + e.toString() + '\n' + e.stack);
    try {
      const c = getConfig();
      TelegramService.sendText('<b>Daily Briefing Error</b>\n' + e.toString(), c.telegramBotToken, c.telegramChatId);
    } catch (_) {}
    throw e;
  }
}

/**
 * Install the daily 6:00 AM ET trigger.
 * Safe to run again — removes old triggers first.
 */
function setupTrigger() {
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === 'runDailyBriefing')
    .forEach(t => ScriptApp.deleteTrigger(t));

  ScriptApp.newTrigger('runDailyBriefing')
    .timeBased()
    .atHour(6)
    .inTimezone('America/New_York')
    .everyDays(1)
    .create();

  Logger.log('Trigger installed: runDailyBriefing fires daily at 6:00 AM America/New_York');
}

/**
 * List all active triggers.
 */
function listTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  if (triggers.length === 0) { Logger.log('No triggers installed.'); return; }
  triggers.forEach(t => Logger.log(t.getHandlerFunction() + ' | ' + t.getTriggerSource()));
}

/**
 * Smoke test — fetches data and runs AI summaries, skips PDF/audio/Telegram.
 */
function testRunWithoutSending() {
  const cfg   = getConfig();
  const today = Utilities.formatDate(new Date(), 'America/New_York', 'MMMM d, yyyy');

  Logger.log('=== TEST RUN (no Telegram send) ===');

  const newsData = NewsService.fetchHeadlines(cfg.gnewsApiKey);
  Logger.log('Geopolitical headlines: ' + newsData.geopolitical.length);
  Logger.log('BusinessTech headlines: ' + newsData.businessTech.length);
  Logger.log('AI headlines: ' + newsData.aiNews.length);
  Logger.log('US headlines: ' + newsData.usNews.length);
  Logger.log('Weather: ' + JSON.stringify(newsData.weather));

  const marketData = MarketService.fetchSummary(cfg.alphaVantageKey);
  Logger.log('US quotes: ' + JSON.stringify(marketData.quotes));
  Logger.log('Mag7: ' + JSON.stringify(marketData.mag7));
  Logger.log('Futures: ' + JSON.stringify(marketData.futures));
  Logger.log('International: ' + JSON.stringify(marketData.international));
  Logger.log('Earnings: ' + JSON.stringify(marketData.earnings));

  const newsSummary   = Summarizer.summarizeNews(newsData, today, cfg.geminiApiKey);
  const marketSummary = Summarizer.summarizeMarkets(marketData, today, cfg.geminiApiKey);
  Logger.log('News summary length: ' + newsSummary.length + ' chars');
  Logger.log('News summary (first 500 chars): ' + newsSummary.substring(0, 500));
  Logger.log('Market summary length: ' + marketSummary.length + ' chars');
  Logger.log('Market summary (first 500 chars): ' + marketSummary.substring(0, 500));

  Logger.log('=== TEST COMPLETE ===');
}
