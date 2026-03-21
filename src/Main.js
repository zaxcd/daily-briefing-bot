// Main.js — Daily briefing orchestrator
// Triggered automatically at 6:00 AM ET every day.
// Run setupTrigger() once manually to install the trigger.

/**
 * Main entry point — called by the time-based trigger every morning.
 * Full pipeline: fetch → summarize → PDF → podcast → Telegram.
 */
function runDailyBriefing() {
  const cfg = getConfig();
  const today = Utilities.formatDate(new Date(), 'America/New_York', 'MMMM d, yyyy');

  Logger.log('[DailyBriefing] Starting run for ' + today);

  try {
    // Step 1: Fetch raw data
    Logger.log('[1/6] Fetching world news headlines...');
    const headlines = NewsService.fetchHeadlines(cfg.gnewsApiKey);
    Logger.log('  Got ' + headlines.length + ' headlines');

    Logger.log('[2/6] Fetching market data...');
    const marketData = MarketService.fetchSummary(cfg.alphaVantageKey);
    Logger.log('  Got quotes for: ' + Object.keys(marketData.quotes).join(', '));

    // Step 2: AI summarization
    Logger.log('[3/6] Generating AI summaries (Gemini)...');
    const newsSummary    = Summarizer.summarizeNews(headlines, today, cfg.geminiApiKey);
    const marketSummary  = Summarizer.summarizeMarkets(marketData, today, cfg.geminiApiKey);
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
    const msg = '[DailyBriefing] ERROR: ' + e.toString();
    Logger.log(msg + '\n' + e.stack);
    // Send error alert to Telegram so you know it failed
    try {
      const c = getConfig();
      TelegramService.sendText(
        '<b>Daily Briefing Error</b>\n' + e.toString(),
        c.telegramBotToken, c.telegramChatId
      );
    } catch (_) {}
    throw e;
  }
}

/**
 * Install the daily 6:00 AM ET trigger.
 * Run this ONCE manually from the Apps Script editor.
 * Safe to run again — removes old triggers for this function first.
 */
function setupTrigger() {
  // Remove any existing triggers for runDailyBriefing to avoid duplicates
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
 * List all active triggers — useful for debugging.
 */
function listTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  if (triggers.length === 0) {
    Logger.log('No triggers installed.');
    return;
  }
  triggers.forEach(t => {
    Logger.log(t.getHandlerFunction() + ' | source: ' + t.getTriggerSource() + ' | id: ' + t.getUniqueId());
  });
}

/**
 * Quick smoke test — runs the full pipeline without sending to Telegram.
 * Logs all outputs so you can verify before going live.
 */
function testRunWithoutSending() {
  const cfg = getConfig();
  const today = Utilities.formatDate(new Date(), 'America/New_York', 'MMMM d, yyyy');

  Logger.log('=== TEST RUN (no Telegram send) ===');

  const headlines  = NewsService.fetchHeadlines(cfg.gnewsApiKey);
  Logger.log('Headlines count: ' + headlines.length);
  Logger.log('First headline: ' + (headlines[0] ? headlines[0].title : 'none'));

  const marketData = MarketService.fetchSummary(cfg.alphaVantageKey);
  Logger.log('Market quotes: ' + JSON.stringify(marketData.quotes));

  const newsSummary   = Summarizer.summarizeNews(headlines, today, cfg.geminiApiKey);
  const marketSummary = Summarizer.summarizeMarkets(marketData, today, cfg.geminiApiKey);
  Logger.log('News summary (first 300 chars): ' + newsSummary.substring(0, 300));
  Logger.log('Market summary (first 300 chars): ' + marketSummary.substring(0, 300));

  Logger.log('=== TEST COMPLETE (PDF/audio/Telegram skipped) ===');
}
