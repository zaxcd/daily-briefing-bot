// Summarizer.js — AI text summarization via Google Gemini 2.0 Flash
// Docs: https://ai.google.dev/gemini-api/docs
// Free tier: 1500 req/day, 15 req/min via Google AI Studio key

const Summarizer = {

  MODEL:    'gemini-2.0-flash',
  BASE_URL: 'https://generativelanguage.googleapis.com/v1beta/models/',

  /**
   * Summarize world news headlines into a 2-page briefing.
   * @param {Array}  headlines  [{title, description, source}]
   * @param {string} date       e.g. "March 21, 2026"
   * @param {string} apiKey
   * @returns {string} Formatted markdown-style text
   */
  summarizeNews: function(headlines, date, apiKey) {
    if (!headlines || headlines.length === 0) {
      return '## World News Briefing — ' + date + '\n\nNo headlines available at this time.';
    }

    const headlineText = headlines.map((h, i) =>
      (i + 1) + '. ' + h.title + ' (' + h.source + ')\n   ' + h.description
    ).join('\n\n');

    const prompt =
      'You are a professional news editor writing a morning briefing for busy executives and traders.\n' +
      'Today is ' + date + '.\n\n' +
      'Top world headlines:\n\n' + headlineText + '\n\n' +
      'Write a crisp 2-page world news briefing with this structure:\n' +
      '- A bold headline: "World News Briefing — ' + date + '"\n' +
      '- 6 to 8 short story summaries (2 to 4 sentences each), grouped by theme where appropriate\n' +
      '- A "Key Themes" section at the end with 3 concise bullet points\n' +
      'Tone: professional, objective, informative. No URLs. No source citations inline.\n' +
      'Target length: 500 to 600 words (approximately 2 printed pages).\n' +
      'Use "## " for section headings and "- " for bullet points.';

    return this._callGemini(prompt, apiKey);
  },

  /**
   * Summarize market data into a 2-page trading briefing.
   * @param {Object} marketData  { quotes, newsHeadlines, fetchTime }
   * @param {string} date
   * @param {string} apiKey
   * @returns {string} Formatted markdown-style text
   */
  summarizeMarkets: function(marketData, date, apiKey) {
    const { quotes, newsHeadlines, fetchTime } = marketData;

    const quotesText = Object.values(quotes).length > 0
      ? Object.values(quotes).map(q =>
          q.name + ': ' + q.price + ' (' + (parseFloat(q.change) >= 0 ? '+' : '') + q.change + ', ' + q.changePct + ')'
        ).join('\n')
      : 'Market quote data unavailable.';

    const marketNewsText = newsHeadlines.length > 0
      ? newsHeadlines.map((h, i) =>
          (i + 1) + '. [' + h.sentiment + '] ' + h.title + '\n   ' + h.summary
        ).join('\n\n')
      : 'No market news available.';

    const prompt =
      'You are a professional market analyst writing a 6 AM morning briefing for active equity and options traders.\n' +
      'Today is ' + date + '. Data as of ' + fetchTime + ' ET (previous session close).\n\n' +
      'MARKET SNAPSHOT:\n' + quotesText + '\n\n' +
      'TOP MARKET NEWS:\n' + marketNewsText + '\n\n' +
      'Write a crisp 2-page market briefing with this structure:\n' +
      '## Market Overview\n(2-3 sentences: yesterday\'s session tone, overnight futures direction, key levels)\n\n' +
      '## Key Movers & Sectors\n(bullet list of notable moves, sector leaders/laggards, any outliers)\n\n' +
      '## Today\'s Watchlist\n(3 to 4 specific things traders should watch: levels, catalysts, events)\n\n' +
      '## Macro Context\n(any Fed, economic data, earnings, or geopolitical factors in play)\n\n' +
      'Tone: direct, data-grounded, trader-focused. Assume reader understands options and technical levels.\n' +
      'Target length: 500 to 600 words. Use "## " for headings and "- " for bullets.';

    return this._callGemini(prompt, apiKey);
  },

  _callGemini: function(prompt, apiKey) {
    const url = this.BASE_URL + this.MODEL + ':generateContent?key=' + apiKey;

    const payload = JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature:     0.35,
        maxOutputTokens: 1200,
        topP:            0.9,
      },
    });

    const options = {
      method:      'post',
      contentType: 'application/json',
      payload:     payload,
      muteHttpExceptions: true,
    };

    const res  = UrlFetchApp.fetch(url, options);
    const code = res.getResponseCode();

    if (code !== 200) {
      const body = res.getContentText().substring(0, 300);
      throw new Error('Gemini API HTTP ' + code + ': ' + body);
    }

    const data = JSON.parse(res.getContentText());
    const text = data.candidates &&
                 data.candidates[0] &&
                 data.candidates[0].content &&
                 data.candidates[0].content.parts &&
                 data.candidates[0].content.parts[0] &&
                 data.candidates[0].content.parts[0].text;

    if (!text) throw new Error('Gemini returned an empty response');
    return text.trim();
  },
};
