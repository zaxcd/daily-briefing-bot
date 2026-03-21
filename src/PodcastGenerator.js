// PodcastGenerator.js — Generate MP3 podcast via Google Cloud Text-to-Speech
// Docs: https://cloud.google.com/text-to-speech/docs/reference/rest/v1/text/synthesize
// Free tier: 1 million Neural2 characters/month (~30 briefings/month = ~90K chars total)
// Requires: Cloud TTS API enabled + API key in Google Cloud Console

const PodcastGenerator = {

  TTS_URL: 'https://texttospeech.googleapis.com/v1/text:synthesize',

  // Neural2 = highest-quality free voice
  // Change 'name' to 'en-US-Neural2-F' for female voice
  VOICE: {
    languageCode: 'en-US',
    name:         'en-US-Neural2-D',
  },

  AUDIO_CONFIG: {
    audioEncoding:  'MP3',
    speakingRate:   1.05,   // Slightly brisk — good for a morning briefing
    pitch:          0.0,
    volumeGainDb:   1.0,
    effectsProfileId: ['headphone-class-device'],
  },

  // Google Cloud TTS max chars per request
  MAX_CHARS: 4900,

  /**
   * Generate a combined world news + markets podcast as an MP3 blob.
   * @param {string} newsSummary
   * @param {string} marketSummary
   * @param {string} date          e.g. "March 21, 2026"
   * @param {string} apiKey        Google Cloud TTS API key
   * @returns {Blob} MP3 blob
   */
  create: function(newsSummary, marketSummary, date, apiKey) {
    const script = this._buildScript(newsSummary, marketSummary, date);
    Logger.log('[PodcastGenerator] Script length: ' + script.length + ' chars');

    const chunks     = this._splitIntoChunks(script);
    const allBytes   = [];

    for (let i = 0; i < chunks.length; i++) {
      Logger.log('[PodcastGenerator] Synthesizing chunk ' + (i + 1) + '/' + chunks.length + ' (' + chunks[i].length + ' chars)');
      const bytes = this._synthesize(chunks[i], apiKey);
      for (let j = 0; j < bytes.length; j++) allBytes.push(bytes[j]);
      if (i < chunks.length - 1) Utilities.sleep(400); // rate limit buffer
    }

    const fileName = 'Morning_Briefing_' + date.replace(/,? /g, '_') + '.mp3';
    Logger.log('[PodcastGenerator] Final audio: ' + allBytes.length + ' bytes → ' + fileName);

    return Utilities.newBlob(allBytes, 'audio/mpeg', fileName);
  },

  _buildScript: function(newsSummary, marketSummary, date) {
    const cleanNews    = this._stripMarkdown(newsSummary);
    const cleanMarkets = this._stripMarkdown(marketSummary);

    // SSML-free plain text script — TTS will handle natural pauses at sentence boundaries
    return (
      'Good morning. Today is ' + date + '. Welcome to your daily briefing. ' +
      'This podcast has two sections: world news, and markets. ' +
      'Let\'s begin.\n\n' +

      'Section one. World News.\n\n' +
      cleanNews + '\n\n' +

      'Section two. Markets.\n\n' +
      cleanMarkets + '\n\n' +

      'That concludes your daily morning briefing for ' + date + '. ' +
      'Have a great trading day. Stay sharp.'
    );
  },

  _stripMarkdown: function(text) {
    return text
      .replace(/#{1,6}\s+/g, '')              // Remove # headings
      .replace(/\*\*(.*?)\*\*/g, '$1')        // Remove **bold**
      .replace(/\*(.*?)\*/g, '$1')            // Remove *italic*
      .replace(/`(.*?)`/g, '$1')              // Remove `code`
      .replace(/^[-*•]\s+/gm, '')             // Remove bullet markers
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove markdown links
      .replace(/\n{3,}/g, '\n\n')             // Collapse extra blank lines
      .replace(/—/g, ', ')                    // Em-dash → pause-friendly comma
      .trim();
  },

  _splitIntoChunks: function(text) {
    if (text.length <= this.MAX_CHARS) return [text];

    const chunks    = [];
    let   remaining = text;

    while (remaining.length > this.MAX_CHARS) {
      // Prefer splitting at a sentence boundary ('. ') within limit
      let splitAt = remaining.lastIndexOf('. ', this.MAX_CHARS);
      if (splitAt === -1 || splitAt < this.MAX_CHARS * 0.5) {
        // Fall back to word boundary
        splitAt = remaining.lastIndexOf(' ', this.MAX_CHARS);
      }
      if (splitAt === -1) splitAt = this.MAX_CHARS;

      chunks.push(remaining.substring(0, splitAt + 1).trim());
      remaining = remaining.substring(splitAt + 1).trim();
    }

    if (remaining.length > 0) chunks.push(remaining);
    return chunks;
  },

  _synthesize: function(text, apiKey) {
    const payload = JSON.stringify({
      input:       { text: text },
      voice:       this.VOICE,
      audioConfig: this.AUDIO_CONFIG,
    });

    const options = {
      method:      'post',
      contentType: 'application/json',
      payload:     payload,
      muteHttpExceptions: true,
    };

    const res  = UrlFetchApp.fetch(this.TTS_URL + '?key=' + apiKey, options);
    const code = res.getResponseCode();

    if (code !== 200) {
      throw new Error('Google TTS API HTTP ' + code + ': ' + res.getContentText().substring(0, 300));
    }

    const data = JSON.parse(res.getContentText());
    if (!data.audioContent) throw new Error('Google TTS returned no audioContent');

    return Utilities.base64Decode(data.audioContent);
  },
};
