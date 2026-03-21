// Config.js — API key management via Script Properties
// Keys are NEVER hardcoded. Set them once via setupProperties() or the Apps Script UI:
//   Project Settings → Script Properties → Add property

/**
 * Returns all config values from Script Properties.
 * Throws if a required key is missing.
 */
function getConfig() {
  const props = PropertiesService.getScriptProperties();
  const required = [
    'GEMINI_API_KEY',
    'GNEWS_API_KEY',
    'ALPHA_VANTAGE_KEY',
    'GOOGLE_TTS_API_KEY',
    'TELEGRAM_BOT_TOKEN',
    'TELEGRAM_CHAT_ID',
  ];

  const missing = required.filter(k => !props.getProperty(k));
  if (missing.length > 0) {
    throw new Error('Missing Script Properties: ' + missing.join(', ') + '. Run setupProperties() first.');
  }

  return {
    geminiApiKey:    props.getProperty('GEMINI_API_KEY'),
    gnewsApiKey:     props.getProperty('GNEWS_API_KEY'),
    alphaVantageKey: props.getProperty('ALPHA_VANTAGE_KEY'),
    googleTtsApiKey: props.getProperty('GOOGLE_TTS_API_KEY'),
    telegramBotToken: props.getProperty('TELEGRAM_BOT_TOKEN'),
    telegramChatId:  props.getProperty('TELEGRAM_CHAT_ID'),
  };
}

/**
 * One-time setup: replace placeholder values with your real API keys,
 * then run this function once from the Apps Script editor.
 * After running, delete or comment out the key values here for safety.
 */
function setupProperties() {
  PropertiesService.getScriptProperties().setProperties({
    GEMINI_API_KEY:      'YOUR_GEMINI_API_KEY',
    GNEWS_API_KEY:       'YOUR_GNEWS_API_KEY',
    ALPHA_VANTAGE_KEY:   'YOUR_ALPHA_VANTAGE_KEY',
    GOOGLE_TTS_API_KEY:  'YOUR_GOOGLE_TTS_API_KEY',
    TELEGRAM_BOT_TOKEN:  'YOUR_TELEGRAM_BOT_TOKEN',
    TELEGRAM_CHAT_ID:    'YOUR_TELEGRAM_CHAT_ID',
  });
  Logger.log('Script Properties set. Update values in Apps Script UI → Project Settings → Script Properties.');
}

/**
 * Verify all required properties are set (safe to run anytime).
 */
function verifyConfig() {
  try {
    const cfg = getConfig();
    Logger.log('Config OK. Keys present: ' + Object.keys(cfg).join(', '));
  } catch (e) {
    Logger.log('Config ERROR: ' + e.message);
  }
}
