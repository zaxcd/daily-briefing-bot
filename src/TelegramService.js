// TelegramService.js — Send PDFs and audio to Telegram via Bot API
// Docs: https://core.telegram.org/bots/api
// File limits: documents up to 50 MB, audio up to 50 MB — our files are well under 5 MB

const TelegramService = {

  BASE_URL: 'https://api.telegram.org/bot',

  /**
   * Send the full daily briefing package:
   * 1. Announcement text message
   * 2. World news PDF
   * 3. Market briefing PDF
   * 4. Podcast MP3
   */
  sendBriefing: function(newsPdfBlob, marketsPdfBlob, audioBlob, date, botToken, chatId) {
    this.sendText(
      '<b>Good morning!</b> Your daily briefing is ready.\n<i>' + date + '</i>',
      botToken, chatId
    );
    Utilities.sleep(600);

    this.sendDocument(newsPdfBlob, 'World News Summary', botToken, chatId);
    Utilities.sleep(600);

    this.sendDocument(marketsPdfBlob, 'Market Briefing', botToken, chatId);
    Utilities.sleep(600);

    this.sendAudio(audioBlob, 'Morning Briefing — ' + date, botToken, chatId);
  },

  /**
   * Send a plain HTML text message.
   */
  sendText: function(text, botToken, chatId) {
    const url = this.BASE_URL + botToken + '/sendMessage';
    return this._post(url, {
      chat_id:    chatId,
      text:       text,
      parse_mode: 'HTML',
    });
  },

  /**
   * Send a document (PDF).
   * Telegram will show a PDF preview inline on iPhone.
   */
  sendDocument: function(blob, caption, botToken, chatId) {
    const url = this.BASE_URL + botToken + '/sendDocument';
    return this._postMultipart(url, {
      chat_id:  chatId,
      caption:  caption,
      document: blob,
    });
  },

  /**
   * Send an audio file (MP3).
   * Telegram displays it with a media player on iPhone (tap to play inline).
   */
  sendAudio: function(blob, title, botToken, chatId) {
    const url = this.BASE_URL + botToken + '/sendAudio';
    return this._postMultipart(url, {
      chat_id:   chatId,
      title:     title,
      performer: 'Daily Briefing Bot',
      audio:     blob,
    });
  },

  // ── Internal helpers ──────────────────────────────────────────────────────

  _post: function(url, payload) {
    const options = {
      method:      'post',
      contentType: 'application/json',
      payload:     JSON.stringify(payload),
      muteHttpExceptions: true,
    };
    const res = UrlFetchApp.fetch(url, options);
    return this._handleResponse(res, 'sendMessage');
  },

  _postMultipart: function(url, formData) {
    const options = {
      method:   'post',
      payload:  formData,
      muteHttpExceptions: true,
    };
    const res = UrlFetchApp.fetch(url, options);
    return this._handleResponse(res, 'multipart');
  },

  _handleResponse: function(res, context) {
    const code = res.getResponseCode();
    const body = res.getContentText();
    if (code !== 200) {
      throw new Error('Telegram ' + context + ' failed (HTTP ' + code + '): ' + body.substring(0, 300));
    }
    const parsed = JSON.parse(body);
    if (!parsed.ok) {
      throw new Error('Telegram API error in ' + context + ': ' + (parsed.description || body));
    }
    return parsed;
  },
};
