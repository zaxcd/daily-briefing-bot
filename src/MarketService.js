// MarketService.js — Fetch market data via Alpha Vantage
// Docs: https://www.alphavantage.co/documentation/
// Free tier: 25 API calls/day, 5 calls/minute
// We fetch 7 symbols + 1 news call = 8 total — well within free limit

const MarketService = {

  // ETF proxies for major indices (Alpha Vantage doesn't support ^SPX directly on free tier)
  SYMBOLS: {
    'SPY': 'S&P 500',
    'QQQ': 'NASDAQ 100',
    'DIA': 'Dow Jones',
    'IWM': 'Russell 2000',
    'VIXY': 'VIX (proxy)',
    'GLD': 'Gold',
    'TLT': 'Bonds (20yr)',
  },

  /**
   * Fetch market snapshot.
   * Returns { quotes: {SYM: {name, price, change, changePct, prevClose}}, newsHeadlines: [...], fetchTime }
   */
  fetchSummary: function(apiKey) {
    const quotes = {};
    const symbols = Object.keys(this.SYMBOLS);

    for (const sym of symbols) {
      try {
        const q = this._fetchQuote(sym, apiKey);
        if (q) quotes[sym] = q;
        Utilities.sleep(300); // stay under 5 calls/min
      } catch (e) {
        Logger.log('[MarketService] Quote error for ' + sym + ': ' + e.message);
      }
    }

    const newsHeadlines = this._fetchMarketNews(apiKey);

    return {
      quotes,
      newsHeadlines,
      fetchTime: Utilities.formatDate(new Date(), 'America/New_York', 'h:mm a z'),
    };
  },

  _fetchQuote: function(symbol, apiKey) {
    const url = 'https://www.alphavantage.co/query'
      + '?function=GLOBAL_QUOTE'
      + '&symbol=' + symbol
      + '&apikey=' + apiKey;

    const res = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    if (res.getResponseCode() !== 200) return null;

    const data = JSON.parse(res.getContentText());
    const q = data['Global Quote'];
    if (!q || !q['05. price']) return null;

    const change = parseFloat(q['09. change'] || 0);
    return {
      name:      this.SYMBOLS[symbol],
      price:     parseFloat(q['05. price']).toFixed(2),
      change:    change.toFixed(2),
      changePct: q['10. change percent'] || '0.00%',
      prevClose: parseFloat(q['08. previous close'] || 0).toFixed(2),
      direction: change >= 0 ? 'up' : 'down',
    };
  },

  _fetchMarketNews: function(apiKey) {
    try {
      const url = 'https://www.alphavantage.co/query'
        + '?function=NEWS_SENTIMENT'
        + '&topics=earnings,financial_markets,economy_macro'
        + '&limit=8'
        + '&sort=RELEVANCE_SCORE'
        + '&apikey=' + apiKey;

      const res = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
      if (res.getResponseCode() !== 200) return [];

      const data = JSON.parse(res.getContentText());
      const feed = data.feed || [];

      return feed.slice(0, 8).map(a => ({
        title:     a.title   || '',
        summary:   (a.summary || '').substring(0, 250),
        source:    a.source  || '',
        sentiment: a.overall_sentiment_label || 'Neutral',
      }));
    } catch (e) {
      Logger.log('[MarketService] News fetch error: ' + e.message);
      return [];
    }
  },
};
