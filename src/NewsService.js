// NewsService.js — Fetch targeted news by category + Roswell GA weather
// GNews API: 5 calls/day with 1.2s delay between calls (free tier: 100/day)
// Weather: Open-Meteo (completely free, no API key)

const NewsService = {

  ROSWELL_GA: { lat: 34.0232, lon: -84.3616 },
  GNEWS_DELAY_MS: 1200, // stay under GNews rate limit

  /**
   * Fetch all news sections + weather.
   * Returns { geopolitical, businessTech, aiNews, usNews, weather }
   */
  fetchHeadlines: function(apiKey) {
    const geopolitical = this._fetchCategory('world',      5, apiKey);
    Utilities.sleep(this.GNEWS_DELAY_MS);

    const business     = this._fetchCategory('business',   4, apiKey);
    Utilities.sleep(this.GNEWS_DELAY_MS);

    const technology   = this._fetchCategory('technology', 4, apiKey);
    Utilities.sleep(this.GNEWS_DELAY_MS);

    const aiNews       = this._fetchSearch('artificial intelligence OR ChatGPT OR machine learning OR AI model', 4, apiKey);
    Utilities.sleep(this.GNEWS_DELAY_MS);

    const usNews       = this._fetchSearch('legislation OR congress OR senate OR election OR tariff OR DOGE', 5, apiKey, 'us');

    const weather      = this._fetchWeather();

    return {
      geopolitical,
      businessTech: [...business, ...technology],
      aiNews,
      usNews,
      weather,
    };
  },

  _fetchCategory: function(category, max, apiKey) {
    try {
      const url = 'https://gnews.io/api/v4/top-headlines'
        + '?category=' + category
        + '&lang=en'
        + '&max=' + max
        + '&apikey=' + apiKey;
      return this._parseGNews(url);
    } catch(e) {
      Logger.log('[NewsService] Category ' + category + ' failed: ' + e.message);
      return [];
    }
  },

  _fetchSearch: function(query, max, apiKey, country) {
    try {
      let url = 'https://gnews.io/api/v4/search'
        + '?q=' + encodeURIComponent(query)
        + '&lang=en'
        + '&max=' + max
        + '&apikey=' + apiKey;
      if (country) url += '&country=' + country;
      return this._parseGNews(url);
    } catch(e) {
      Logger.log('[NewsService] Search failed for "' + query + '": ' + e.message);
      return [];
    }
  },

  _parseGNews: function(url) {
    const res  = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    const code = res.getResponseCode();
    if (code !== 200) throw new Error('GNews HTTP ' + code);
    const data = JSON.parse(res.getContentText());
    return (data.articles || []).map(a => ({
      title:       a.title       || '',
      description: a.description || '',
      source:      a.source ? a.source.name : 'Unknown',
    }));
  },

  _fetchWeather: function() {
    try {
      const url = 'https://api.open-meteo.com/v1/forecast'
        + '?latitude='  + this.ROSWELL_GA.lat
        + '&longitude=' + this.ROSWELL_GA.lon
        + '&current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m'
        + '&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code'
        + '&temperature_unit=fahrenheit'
        + '&wind_speed_unit=mph'
        + '&precipitation_unit=inch'
        + '&timezone=America/New_York'
        + '&forecast_days=1';

      const res  = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
      const code = res.getResponseCode();
      if (code !== 200) throw new Error('Open-Meteo HTTP ' + code + ': ' + res.getContentText().substring(0, 200));
      const data = JSON.parse(res.getContentText());
      const c    = data.current;
      const d    = data.daily;

      return {
        condition: this._weatherDesc(c.weather_code),
        tempNow:   Math.round(c.temperature_2m),
        tempHigh:  Math.round(d.temperature_2m_max[0]),
        tempLow:   Math.round(d.temperature_2m_min[0]),
        humidity:  Math.round(c.relative_humidity_2m),
        wind:      Math.round(c.wind_speed_10m),
        precip:    d.precipitation_sum[0] || 0,
        location:  'Roswell, GA',
      };
    } catch(e) {
      Logger.log('[NewsService] Weather fetch failed: ' + e.message);
      return null;
    }
  },

  _weatherDesc: function(code) {
    if (code === 0)  return 'Clear sky';
    if (code <= 3)   return 'Partly cloudy';
    if (code <= 48)  return 'Foggy';
    if (code <= 55)  return 'Drizzle';
    if (code <= 65)  return 'Rain';
    if (code <= 75)  return 'Snow';
    if (code <= 82)  return 'Rain showers';
    if (code <= 99)  return 'Thunderstorms';
    return 'Unknown';
  },
};
