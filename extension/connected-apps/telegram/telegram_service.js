/**
 * =========================================================================
 * Browser Agent - Connected Apps: Telegram Bot Service Worker Module
 * Core Telegram API Handlers, Formatting & Polling Service
 * =========================================================================
 */

function formatMarkdownForTelegram(text) {
  if (!text) return "";
  let t = text;

  // Protect code blocks
  const codeBlocks = [];
  t = t.replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g, (match, lang, code) => {
    const placeholder = `___TG_CODE_BLOCK_${codeBlocks.length}___`;
    codeBlocks.push({ lang, code });
    return placeholder;
  });

  // Protect inline code
  const inlineCodes = [];
  t = t.replace(/`([^`]+)`/g, (match, code) => {
    const placeholder = `___TG_INLINE_CODE_${inlineCodes.length}___`;
    inlineCodes.push(code);
    return placeholder;
  });

  // Escape HTML characters in normal text
  t = t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  // Bold **text** -> <b>text</b>
  t = t.replace(/\*\*(.*?)\*\*/g, "<b>$1</b>");

  // Italic *text* or _text_ -> <i>text</i>
  t = t.replace(/\*([^\*]+)\*/g, "<i>$1</i>");
  t = t.replace(/(^|\s)_([^_]+)_(\s|$)/g, "$1<i>$2</i>$3");

  // Restore inline codes
  inlineCodes.forEach((code, idx) => {
    const escaped = code.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    t = t.replace(`___TG_INLINE_CODE_${idx}___`, `<code>${escaped}</code>`);
  });

  // Restore code blocks
  codeBlocks.forEach((item, idx) => {
    const escaped = item.code.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    t = t.replace(`___TG_CODE_BLOCK_${idx}___`, `<pre><code>${escaped}</code></pre>`);
  });

  return t;
}

if (typeof self !== 'undefined') {
  self.formatMarkdownForTelegram = formatMarkdownForTelegram;
}
if (typeof window !== 'undefined') {
  window.formatMarkdownForTelegram = formatMarkdownForTelegram;
}
