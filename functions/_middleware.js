/**
 * Cloudflare Pages Function: serves a Markdown representation of HTML pages
 * when the client sends `Accept: text/markdown`, per the "Markdown for
 * Agents" content-negotiation pattern (native Cloudflare Pro feature —
 * this reimplements it at the edge for Pages on the Free plan).
 *
 * Browsers (Accept: text/html, */ /*, etc.) are untouched and get the
 * normal HTML response, unchanged, from the origin.
 */

export async function onRequest(context) {
  const { request, next } = context;
  const accept = request.headers.get("Accept") || "";

  const wantsMarkdown = accept.includes("text/markdown");
  if (!wantsMarkdown) {
    const htmlResponse = await next();
    const headers = new Headers(htmlResponse.headers);
    headers.set("Vary", "Accept");
    return new Response(htmlResponse.body, {
      status: htmlResponse.status,
      statusText: htmlResponse.statusText,
      headers,
    });
  }

  const response = await next();
  const contentType = response.headers.get("Content-Type") || "";
  if (!contentType.includes("text/html")) {
    return response;
  }

  const html = await response.text();
  const markdown = htmlToMarkdown(html);

  const headers = new Headers(response.headers);
  headers.set("Content-Type", "text/markdown; charset=utf-8");
  headers.set("Vary", "Accept");
  headers.set("X-Markdown-Tokens", String(estimateTokens(markdown)));
  // Never let the edge cache a markdown response under the same cache key
  // as the HTML response — Vary: Accept isn't reliably honored by every
  // cache layer, and serving Markdown to a browser breaks the site.
  headers.set("Cache-Control", "private, no-store");

  return new Response(markdown, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

/** Rough token estimate (chars/4), good enough for an advisory header. */
function estimateTokens(text) {
  return Math.ceil(text.length / 4);
}

/**
 * Minimal, dependency-free HTML -> Markdown conversion tuned for this
 * site's static marketing pages. Strips scripts/styles/nav chrome, keeps
 * headings, links, lists, and paragraph text.
 */
function htmlToMarkdown(html) {
  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  const descMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i);

  let body = html;
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  if (bodyMatch) body = bodyMatch[1];

  body = body
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<svg[\s\S]*?<\/svg>/gi, "")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, "");

  body = body
    .replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, (_, t) => `\n# ${clean(t)}\n`)
    .replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, (_, t) => `\n## ${clean(t)}\n`)
    .replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, (_, t) => `\n### ${clean(t)}\n`)
    .replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, (_, t) => `\n#### ${clean(t)}\n`)
    .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_, t) => `- ${clean(t)}\n`)
    .replace(/<a\s+[^>]*href=["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi, (_, href, text) => {
      const label = clean(text);
      if (!label) return "";
      return `[${label}](${href})`;
    })
    .replace(/<\/(p|div|section|article|header|footer|ul|ol)>/gi, "\n\n")
    .replace(/<br\s*\/?>/gi, "\n");

  body = body.replace(/<[^>]+>/g, "");
  body = decodeEntities(body);
  body = body
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  const title = titleMatch ? clean(titleMatch[1]) : "";
  const description = descMatch ? clean(descMatch[1]) : "";

  const header = [title ? `# ${title}` : "", description ? `\n${description}\n` : ""]
    .filter(Boolean)
    .join("\n");

  return `${header}\n\n${body}\n`;
}

function clean(text) {
  return decodeEntities(text.replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();
}

function decodeEntities(text) {
  return text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&aacute;/g, "á")
    .replace(/&eacute;/g, "é")
    .replace(/&iacute;/g, "í")
    .replace(/&oacute;/g, "ó")
    .replace(/&uacute;/g, "ú")
    .replace(/&ntilde;/g, "ñ")
    .replace(/&Aacute;/g, "Á")
    .replace(/&Eacute;/g, "É")
    .replace(/&Iacute;/g, "Í")
    .replace(/&Oacute;/g, "Ó")
    .replace(/&Uacute;/g, "Ú")
    .replace(/&Ntilde;/g, "Ñ");
}
