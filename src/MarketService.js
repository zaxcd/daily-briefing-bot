// MarketService.js — Market data via Yahoo Finance (free, no key) + Alpha Vantage (news + earnings only)
// Yahoo Finance: all price quotes (US, Mag7, futures, international) — no rate limit, no daily cap
// Alpha Vantage (free 25 req/day): NEWS_SENTIMENT + EARNINGS_CALENDAR = 2 calls only

const MarketService = {

  // Major US indices (actual index levels)
  INDICES: {
    '^GSPC': 'S&P 500 (SPX)',
    '^NDX':  'NASDAQ 100 (NDX)',
    '^DJI':  'Dow Jones (DJIA)',
    '^RUT':  'Russell 2000',
  },

  // US broad market ETFs + commodities
  US_SYMBOLS: {
    'SPY':  'S&P 500 ETF',
    'QQQ':  'NASDAQ 100 ETF',
    'DIA':  'Dow Jones ETF',
    'IWM':  'Russell 2000 ETF',
    'UVXY': 'VIX (UVXY)',
    'GLD':  'Gold (GLD)',
    'SLV':  'Silver (SLV)',
    'TLT':  'Bonds (20yr)',
  },

  // Sector ETFs (all 11 GICS sectors)
  SECTORS: {
    'XLK':  'Technology',
    'XLC':  'Communication Services',
    'XLY':  'Consumer Discretionary',
    'XLP':  'Consumer Staples',
    'XLF':  'Financials',
    'XLV':  'Health Care',
    'XLI':  'Industrials',
    'XLE':  'Energy',
    'XLB':  'Materials',
    'XLRE': 'Real Estate',
    'XLU':  'Utilities',
  },

  // Magnificent 7
  MAG7: {
    'AAPL':  'Apple',
    'MSFT':  'Microsoft',
    'GOOGL': 'Alphabet',
    'AMZN':  'Amazon',
    'META':  'Meta',
    'NVDA':  'NVIDIA',
    'TSLA':  'Tesla',
  },

  // International indices
  INTERNATIONAL: {
    '^N225':  'Nikkei 225 (Japan)',
    '^GDAXI': 'DAX (Germany)',
    '^FTSE':  'FTSE 100 (UK)',
    '^FCHI':  'CAC 40 (France)',
  },

  // ES & NQ futures
  FUTURES: {
    'ES=F': 'S&P 500 E-mini (ES)',
    'NQ=F': 'NASDAQ E-mini (NQ)',
  },

  /**
   * Fetch full market snapshot.
   */
  fetchSummary: function(apiKey) {
    // All price data via Yahoo Finance (free, reliable)
    const allSymbols = Object.assign({},
      this.INDICES,
      this.US_SYMBOLS,
      this.SECTORS,
      this.MAG7,
      this.INTERNATIONAL,
      this.FUTURES
    );
    const allQuotes = this._fetchYahooQuotes(allSymbols);

    // Split into categories
    const indices      = this._pick(allQuotes, Object.keys(this.INDICES));
    const quotes       = this._pick(allQuotes, Object.keys(this.US_SYMBOLS));
    const sectors      = this._pick(allQuotes, Object.keys(this.SECTORS));
    const mag7         = this._pick(allQuotes, Object.keys(this.MAG7));
    const international = this._pick(allQuotes, Object.keys(this.INTERNATIONAL));
    const futures      = this._pick(allQuotes, Object.keys(this.FUTURES));

    // Alpha Vantage: only news sentiment + earnings (2 calls)
    const newsHeadlines = this._fetchMarketNews(apiKey);
    const earnings      = this._fetchEarningsToday(apiKey);

    return {
      indices,
      quotes,
      sectors,
      mag7,
      futures,
      international,
      newsHeadlines,
      earnings,
      fetchTime: Utilities.formatDate(new Date(), 'America/New_York', 'h:mm a z'),
    };
  },

  _pick: function(obj, keys) {
    const result = {};
    keys.forEach(k => { if (obj[k]) result[k] = obj[k]; });
    return result;
  },

  // ── Yahoo Finance ────────────────────────────────────────────────────────

  _fetchYahooQuotes: function(symbolMap) {
    const result = {};
    for (const sym of Object.keys(symbolMap)) {
      try {
        const q = this._fetchYahooQuote(sym, symbolMap[sym]);
        if (q) result[sym] = q;
        Utilities.sleep(150);
      } catch(e) {
        Logger.log('[MarketService] Yahoo error ' + sym + ': ' + e.message);
      }
    }
    return result;
  },

  _fetchYahooQuote: function(symbol, name) {
    const encoded = encodeURIComponent(symbol);
    const url = 'https://query1.finance.yahoo.com/v8/finance/chart/'
      + encoded + '?interval=1d&range=2d';
    const res  = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    if (res.getResponseCode() !== 200) return null;

    const data   = JSON.parse(res.getContentText());
    const result = data.chart && data.chart.result && data.chart.result[0];
    if (!result) return null;

    const meta      = result.meta;
    const price     = meta.regularMarketPrice;
    const prevClose = meta.chartPreviousClose || meta.previousClose || price;
    if (!price) return null;

    const change    = price - prevClose;
    const changePct = prevClose ? (change / prevClose * 100) : 0;

    return {
      name,
      price:     price.toFixed(2),
      change:    change.toFixed(2),
      changePct: changePct.toFixed(2) + '%',
      prevClose: prevClose.toFixed(2),
      direction: change >= 0 ? 'up' : 'down',
    };
  },

  // ── Alpha Vantage: news + earnings only (2 calls total) ─────────────────

  _fetchMarketNews: function(apiKey) {
    try {
      const mag7Tickers = Object.keys(this.MAG7).join(',');
      const url = 'https://www.alphavantage.co/query'
        + '?function=NEWS_SENTIMENT'
        + '&tickers=' + mag7Tickers
        + '&topics=earnings,financial_markets,economy_macro,technology'
        + '&limit=10&sort=RELEVANCE_SCORE&apikey=' + apiKey;
      const res  = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
      if (res.getResponseCode() !== 200) return [];
      const feed = JSON.parse(res.getContentText()).feed || [];
      return feed.slice(0, 10).map(a => ({
        title:     a.title   || '',
        summary:   (a.summary || '').substring(0, 300),
        source:    a.source  || '',
        sentiment: a.overall_sentiment_label || 'Neutral',
        tickers:   (a.ticker_sentiment || []).map(t => t.ticker).join(', '),
      }));
    } catch(e) {
      Logger.log('[MarketService] Market news error: ' + e.message);
      return [];
    }
  },

  _fetchEarningsToday: function(apiKey) {
    try {
      const today = Utilities.formatDate(new Date(), 'America/New_York', 'yyyy-MM-dd');
      const url   = 'https://www.alphavantage.co/query'
        + '?function=EARNINGS_CALENDAR&horizon=3month&apikey=' + apiKey;
      const res   = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
      if (res.getResponseCode() !== 200) return [];

      const mag7Syms = Object.keys(this.MAG7);
      const results  = [];
      const lines    = res.getContentText().split('\n').slice(1);

      for (const line of lines) {
        const cols = line.split(',');
        if (cols.length < 3) continue;
        const sym     = cols[0].trim();
        const repDate = cols[2].trim();
        if (repDate === today && mag7Syms.includes(sym)) {
          results.push({
            symbol:     sym,
            name:       cols[1].trim(),
            reportDate: repDate,
            estimate:   cols[4] ? cols[4].trim() : 'N/A',
          });
        }
      }
      return results;
    } catch(e) {
      Logger.log('[MarketService] Earnings error: ' + e.message);
      return [];
    }
  },
};
