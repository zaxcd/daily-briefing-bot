// PdfGenerator.js — Create a styled Google Doc and export it as a PDF Blob
// The temporary Google Doc is created, exported to PDF, then trashed — Drive stays clean.
// Uses native Apps Script DocumentApp + DriveApp (no external dependencies).

const PdfGenerator = {

  // Brand colors
  COLOR_TITLE:   '#1a1a2e',
  COLOR_HEADING: '#1a1a2e',
  COLOR_BODY:    '#222222',
  COLOR_META:    '#888888',

  /**
   * Create a formatted PDF from summary text.
   * @param {string} summaryText  Markdown-style text (## headings, - bullets, **bold**)
   * @param {string} title        e.g. "World News Briefing" or "Market Briefing"
   * @param {string} date         e.g. "March 21, 2026"
   * @returns {Blob} PDF blob ready to send via Telegram
   */
  create: function(summaryText, title, date) {
    const docTitle = title + ' \u2014 ' + date;
    const doc  = DocumentApp.create(docTitle);
    const body = doc.getBody();

    // Page margins: ~0.75 inch all sides (in points)
    body.setMarginTop(54).setMarginBottom(54).setMarginLeft(54).setMarginRight(54);
    body.clear();

    // ── Title block ──────────────────────────────────────────────────────────
    const titlePara = body.appendParagraph(title.toUpperCase());
    titlePara.setSpacingAfter(2);
    titlePara.getChild(0).asText()
      .setFontFamily('Arial')
      .setFontSize(18)
      .setBold(true)
      .setForegroundColor(this.COLOR_TITLE);

    const datePara = body.appendParagraph(date);
    datePara.setSpacingAfter(8);
    datePara.getChild(0).asText()
      .setFontFamily('Arial')
      .setFontSize(11)
      .setBold(false)
      .setForegroundColor(this.COLOR_META);

    body.appendHorizontalRule();

    // ── Body content ─────────────────────────────────────────────────────────
    const lines = summaryText.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const raw     = lines[i];
      const trimmed = raw.trim();

      if (trimmed === '') {
        body.appendParagraph('').setSpacingBefore(2).setSpacingAfter(2);
        continue;
      }

      // Skip top-level H1 (already rendered as title above)
      if (trimmed.match(/^#\s+/)) continue;

      // ## Section heading
      if (trimmed.startsWith('## ')) {
        const text = trimmed.replace(/^## /, '');
        const p = body.appendParagraph(text);
        p.setSpacingBefore(10).setSpacingAfter(3);
        p.getChild(0).asText()
          .setFontFamily('Arial')
          .setFontSize(12)
          .setBold(true)
          .setForegroundColor(this.COLOR_HEADING);
        continue;
      }

      // ### Sub-heading
      if (trimmed.startsWith('### ')) {
        const text = trimmed.replace(/^### /, '');
        const p = body.appendParagraph(text);
        p.setSpacingBefore(6).setSpacingAfter(2);
        p.getChild(0).asText()
          .setFontFamily('Arial')
          .setFontSize(11)
          .setBold(true)
          .setForegroundColor(this.COLOR_HEADING);
        continue;
      }

      // Bullet point
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        const text = trimmed.replace(/^[-*] /, '');
        const p = body.appendListItem(this._stripInlineMarkdown(text));
        p.setGlyphType(DocumentApp.GlyphType.BULLET);
        p.setSpacingBefore(1).setSpacingAfter(1);
        p.getChild(0).asText()
          .setFontFamily('Arial')
          .setFontSize(10)
          .setForegroundColor(this.COLOR_BODY);
        continue;
      }

      // Regular paragraph
      const p = body.appendParagraph(this._stripInlineMarkdown(trimmed));
      p.setSpacingBefore(2).setSpacingAfter(4);
      p.getChild(0).asText()
        .setFontFamily('Arial')
        .setFontSize(10.5)
        .setForegroundColor(this.COLOR_BODY);
    }

    // ── Footer ───────────────────────────────────────────────────────────────
    body.appendHorizontalRule();
    const footer = body.appendParagraph('Generated at 6:00 AM ET  \u00b7  Daily Briefing Bot');
    footer.setSpacingBefore(4);
    footer.getChild(0).asText()
      .setFontFamily('Arial')
      .setFontSize(8)
      .setItalic(true)
      .setForegroundColor(this.COLOR_META);

    doc.saveAndClose();

    // Export to PDF
    const fileName = title.replace(/ /g, '_') + '_' + date.replace(/,? /g, '_') + '.pdf';
    const file     = DriveApp.getFileById(doc.getId());
    const pdfBlob  = file.getAs('application/pdf').setName(fileName);

    // Trash the temp Doc to keep Drive clean
    file.setTrashed(true);

    return pdfBlob;
  },

  /** Strip **bold**, *italic*, and `code` markers from inline text */
  _stripInlineMarkdown: function(text) {
    return text
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/`(.*?)`/g, '$1');
  },
};
