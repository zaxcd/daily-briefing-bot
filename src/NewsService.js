// NewsService.js — Fetch world news headlines
// Primary: GNews API (https://gnews.io — free 100 req/day)
// Fallback: BBC World News RSS feed (no API key required)

const NewsService = {

  /**
   * Fetch top world headlines.
   * Returns array of { title, description, source, url, publishedAt }
   */
  fetchHeadlines: function(apiKey) {
    try {
      return this._fetchGNews(apiKey);
    } catch (e) {
      Logger.log('[NewsService] GNews failed (' + e.message + '), falling back to BBC RSS');
      return this._fetchBbcRss();
    }
  },

  _fetchGNews: function(apiKey) {
    const url = 'https://gnews.io/api/v4/top-headlines'
      + '?category=general'
      + '&lang=en'
      + '&max=10'
      + '&apikey=' + apiKey;

    const res = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    const code = res.getResponseCode();

    if (code !== 200) {
      throw new Error('GNews API HTTP ' + code + ': ' + res.getContentText().substring(0, 200));
    }

    const data = JSON.parse(res.getContentText());
    const articles = data.articles || [];

    if (articles.length === 0) {
      throw new Error('GNews returned 0 articles');
    }

    return articles.map(a => ({
      title:       a.title        || '(no title)',
      description: a.description  || '',
      source:      a.source ? a.source.name : 'Unknown',
      url:         a.url          || '',
      publishedAt: a.publishedAt  || '',
    }));
  },

  _fetchBbcRss: function() {
    const rssUrl = 'https://feeds.bbci.co.uk/news/world/rss.xml';
    const xml = UrlFetchApp.fetch(rssUrl, { muteHttpExceptions: true }).getContentText();
    const doc = XmlService.parse(xml);
    const ns = XmlService.getNamespace('http://purl.org/dc/elements/1.1/');
    const items = doc.getRootElement().getChild('channel').getChildren('item');

    return items.slice(0, 10).map(item => ({
      title:       item.getChildText('title')       || '(no title)',
      description: item.getChildText('description') || '',
      source:      'BBC News',
      url:         item.getChildText('link')        || '',
      publishedAt: item.getChildText('pubDate')     || '',
    }));
  },
};
