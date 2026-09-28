// Summarizer.js — AI summarization via Google Gemini
// Model: gemini-2.5-flash (thinking disabled for faster, longer output)

const Summarizer = {

  MODEL:    'gemini-2.5-flash',
  BASE_URL: 'https://generativelanguage.googleapis.com/v1beta/models/',

  /**
   * Summarize structured news data into a 4-page world news briefing.
   * @param {Object} newsData  { geopolitical, businessTech, aiNews, usNews, weather }
   * @param {string} date
   * @param {string} apiKey
   */
  summarizeNews: function(newsData, date, apiKey) {
    const { geopolitical, businessTech, aiNews, usNews, weather } = newsData;

    const fmt = arr => arr.length > 0
      ? arr.map((h, i) => (i + 1) + '. ' + h.title + '\n   ' + h.description).join('\n\n')
      : 'No stories available.';

    const weatherStr = weather
      ? weather.location + ': ' + weather.condition + ', ' + weather.tempNow + '°F now, '
        + 'High ' + weather.tempHigh + '°F / Low ' + weather.tempLow + '°F, '
        + 'Humidity ' + weather.humidity + '%, Wind ' + weather.wind + ' mph'
      : 'Weather data unavailable.';

    const prompt =
      'You are a professional news editor writing a morning briefing for a busy executive and active trader in Roswell, GA.\n' +
      'Today is ' + date + '.\n\n' +

      'GEOPOLITICAL NEWS:\n' + fmt(geopolitical) + '\n\n' +
      'BUSINESS & TECHNOLOGY NEWS:\n' + fmt(businessTech) + '\n\n' +
      'ARTIFICIAL INTELLIGENCE NEWS:\n' + fmt(aiNews) + '\n\n' +
      'US NEWS (Legislation, Elections, Policy, Disruption):\n' + fmt(usNews) + '\n\n' +
      'ROSWELL, GA WEATHER TODAY:\n' + weatherStr + '\n\n' +

      'Write a comprehensive 4-page world news briefing using EXACTLY this structure:\n\n' +
      '## World News Briefing — ' + date + '\n\n' +
      '## Geopolitical & Global Affairs\n' +
      '(Write 4 to 5 stories, 3 to 5 sentences each. Cover tensions, diplomacy, conflicts, and international relations.)\n\n' +
      '## Business & Markets\n' +
      '(Write 4 stories, 3 to 4 sentences each. Cover major corporate news, economic shifts, trade.)\n\n' +
      '## Technology & AI\n' +
      '(Write 4 stories, 3 to 4 sentences each. Cover AI breakthroughs, tech company news, product launches, regulation.)\n\n' +
      '## United States\n' +
      '(Write 4 to 5 stories, 3 to 4 sentences each. Cover legislation, elections, political disruption, domestic policy.)\n\n' +
      '## Roswell, GA Weather\n' +
      '(2 to 3 sentences: today\'s conditions, what to expect, any advisories.)\n\n' +
      '## Key Themes\n' +
      '(5 concise bullet points summarizing the biggest threads across all sections.)\n\n' +
      'Tone: professional, objective, informative. No URLs. No source citations.\n' +
      'IMPORTANT: Write at least 1,000 words. This is a 4-page document — be thorough and detailed in every section.';

    return this._callGemini(prompt, apiKey);
  },

  /**
   * Summarize market data into a 4-page trading briefing.
   * @param {Object} marketData  { quotes, mag7, futures, international, newsHeadlines, earnings, fetchTime }
   * @param {string} date
   * @param {string} apiKey
   */
  summarizeMarkets: function(marketData, date, apiKey) {
    const { indices, quotes, sectors, mag7, futures, international, newsHeadlines, earnings, fetchTime } = marketData;

    const fmtQuotes = obj => Object.values(obj).length > 0
      ? Object.values(obj).map(q =>
          q.name + ': ' + q.price + ' (' + (parseFloat(q.change) >= 0 ? '+' : '') + q.change + ', ' + q.changePct + ')'
        ).join('\n')
      : 'Data unavailable.';

    // Sectors sorted by % change descending so Gemini can identify top/bottom performers
    const fmtSectors = obj => {
      const entries = Object.values(obj);
      if (entries.length === 0) return 'Data unavailable.';
      entries.sort((a, b) => parseFloat(b.changePct) - parseFloat(a.changePct));
      return entries.map(q =>
        q.name + ': ' + q.price + ' (' + (parseFloat(q.change) >= 0 ? '+' : '') + q.change + ', ' + q.changePct + ')'
      ).join('\n');
    };

    const fmtNews = arr => arr.length > 0
      ? arr.map((h, i) =>
          (i + 1) + '. [' + h.sentiment + '] ' + h.title +
          (h.tickers ? ' [' + h.tickers + ']' : '') + '\n   ' + h.summary
        ).join('\n\n')
      : 'No market news available.';

    const earningsStr = earnings.length > 0
      ? earnings.map(e => e.symbol + ' (' + e.name + ') — EPS estimate: ' + e.estimate).join('\n')
      : 'No Mag 7 earnings scheduled today.';

    const prompt =
      'You are a senior market analyst writing a comprehensive 6 AM market briefing for active equity and options traders.\n' +
      'Today is ' + date + '. Data as of previous session close (' + fetchTime + ' ET).\n\n' +

      'MAJOR US INDICES (previous close):\n' + fmtQuotes(indices) + '\n\n' +
      'US BROAD MARKET ETFs & COMMODITIES (previous close):\n' + fmtQuotes(quotes) + '\n\n' +
      'ES & NQ FUTURES:\n' + fmtQuotes(futures) + '\n\n' +
      'INTERNATIONAL INDICES:\n' + fmtQuotes(international) + '\n\n' +
      'SECTOR ETFs — sorted strongest to weakest (previous close):\n' + fmtSectors(sectors) + '\n\n' +
      'MAGNIFICENT 7 (previous close):\n' + fmtQuotes(mag7) + '\n\n' +
      'MAG 7 EARNINGS TODAY:\n' + earningsStr + '\n\n' +
      'TOP MARKET NEWS:\n' + fmtNews(newsHeadlines) + '\n\n' +

      'Write a comprehensive 4-page market briefing using EXACTLY this structure:\n\n' +
      '## Market Briefing — ' + date + '\n\n' +
      '## Global Events & Market Reaction\n' +
      '(3 to 4 paragraphs: what global macro events are driving markets — geopolitics, Fed, economic data, trade. ' +
      'How are global markets reacting? What is the narrative heading into the US open?)\n\n' +
      '## Market Sentiment & Overview\n' +
      '(2 to 3 paragraphs: overall risk-on/risk-off tone, fear/greed dynamics, breadth. ' +
      'Cover SPX and NDX index levels specifically. Cover Gold and Silver price action and what it signals — ' +
      'safe-haven demand, inflation expectations, or dollar dynamics. What is the dominant theme today?)\n\n' +
      '## Sector Rotation — Strong vs. Weak\n' +
      '(3 to 4 paragraphs: identify the top 3 strongest sectors and bottom 3 weakest sectors by % change. ' +
      'Explain what the rotation pattern signals — risk-on vs. risk-off, defensive vs. cyclical, growth vs. value. ' +
      'Which sectors show follow-through potential? Which are rolling over? What does this imply for traders today?)\n\n' +
      '## European & Asian Markets\n' +
      '(2 to 3 paragraphs: detail Nikkei, DAX, FTSE, CAC 40 moves. What drove them? ' +
      'Any divergence between regions? Implications for US open.)\n\n' +
      '## ES & NQ Futures\n' +
      '(2 paragraphs: current futures direction, key levels to watch — support, resistance, overnight range. ' +
      'What does the futures action imply for the US open?)\n\n' +
      '## Magnificent 7 — Individual Breakdown\n' +
      '(For each of the 7 stocks — AAPL, MSFT, GOOGL, AMZN, META, NVDA, TSLA — write 2 sentences: ' +
      'the price action and any specific catalyst, news, or setup for today. ' +
      'If earnings are today, flag it prominently.)\n\n' +
      '## Mag 7 Earnings & Catalysts Today\n' +
      '(Paragraph: any Mag 7 earnings today with estimates. Any major product launches, events, or analyst calls today.)\n\n' +
      '## Today\'s Watchlist & Key Levels\n' +
      '(5 to 6 bullet points: the most important things traders need to watch today — specific price levels, ' +
      'time-based events like Fed speakers or economic data releases, and any binary events.)\n\n' +
      'Tone: direct, data-grounded, specific, trader-focused. Include specific numbers from the data provided.\n' +
      'IMPORTANT: Write at least 1,000 words. This is a 4-page document — every section must be thorough.';

    return this._callGemini(prompt, apiKey);
  },

  _callGemini: function(prompt, apiKey) {
    const url = this.BASE_URL + this.MODEL + ':generateContent?key=' + apiKey;

    const payload = JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature:    0.35,
        maxOutputTokens: 4096,
        topP:           0.9,
        thinkingConfig: { thinkingBudget: 0 },
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
      throw new Error('Gemini API HTTP ' + code + ': ' + res.getContentText().substring(0, 300));
    }

    const data  = JSON.parse(res.getContentText());
    const parts = data.candidates &&
                  data.candidates[0] &&
                  data.candidates[0].content &&
                  data.candidates[0].content.parts;

    if (!parts || parts.length === 0) throw new Error('Gemini returned an empty response');

    const text = parts
      .filter(p => !p.thought)
      .map(p => p.text || '')
      .join('');

    if (!text.trim()) throw new Error('Gemini returned blank text');
    return text.trim();
  },
};
