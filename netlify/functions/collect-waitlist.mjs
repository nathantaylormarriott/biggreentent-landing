/**
 * Appends a waitlist row to a CSV file in a GitHub repo (use a *private* repo for PII).
 * Env in Netlify: GITHUB_TOKEN, GITHUB_REPO (owner/name), optional GITHUB_CSV_PATH, GITHUB_BRANCH, ALLOWED_ORIGIN
 */

const GITHUB_API = "https://api.github.com";

function escCsv(s) {
  if (s == null) return "";
  const t = String(s);
  if (/[",\n\r]/.test(t)) return `"${t.replace(/"/g, '""')}"`;
  return t;
}

export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: { "Content-Type": "text/plain" }, body: "Method not allowed" };
  }

  const allowed = process.env.ALLOWED_ORIGIN;
  if (allowed) {
    try {
      const op = (event.headers?.origin || event.headers?.Origin || "").trim();
      if (op) {
        const w = new URL(allowed);
        if (new URL(op).origin !== w.origin) {
          return { statusCode: 403, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: "forbidden" }) };
        }
      }
    } catch {
      // ignore parse errors, allow (dev)
    }
  }

  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;
  const path = process.env.GITHUB_CSV_PATH || "data/waitlist.csv";
  const branch = process.env.GITHUB_BRANCH || "main";

  if (!token || !repo) {
    return {
      statusCode: 503,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "not_configured", detail: "Set GITHUB_TOKEN and GITHUB_REPO in Netlify" }),
    };
  }

  const [owner, repon] = repo.split("/");
  if (!owner || !repon) {
    return { statusCode: 500, body: JSON.stringify({ error: "invalid GITHUB_REPO" }) };
  }

  const type = (event.headers["content-type"] || event.headers["Content-Type"] || "").toLowerCase();
  let name = "";
  let email = "";
  let bot = "";

  if (type.includes("application/x-www-form-urlencoded")) {
    const sp = new URLSearchParams(event.body || "");
    bot = (sp.get("bot-field") || "").trim();
    name = (sp.get("name") || "").trim();
    email = (sp.get("email") || "").trim();
  } else if (type.includes("application/json")) {
    const j = JSON.parse(event.body || "{}");
    bot = (j["bot-field"] || "").toString().trim();
    name = (j.name || "").toString().trim();
    email = (j.email || "").toString().trim();
  } else {
    return { statusCode: 400, body: JSON.stringify({ error: "unsupported content-type" }) };
  }

  if (bot) {
    return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ok: true, ignored: true }) };
  }

  if (!name || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { statusCode: 400, body: JSON.stringify({ error: "invalid name or email" }) };
  }

  const time = new Date().toISOString();
  const line = `${escCsv(name)},${escCsv(email)},${escCsv(time)}\n`;

  const url = `${GITHUB_API}/repos/${owner}/${repon}/contents/${encodeURI(path)}`;
  const headers = {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "biggreen-waitlist-netlify",
  };

  let existing = "";
  let sha = null;
  const get = await fetch(`${url}?ref=${encodeURIComponent(branch)}`, { headers });
  if (get.status === 200) {
    const file = await get.json();
    sha = file.sha;
    existing = Buffer.from(file.content, "base64").toString("utf8");
  } else if (get.status === 404) {
    existing = "name,email,submitted_at\n";
  } else {
    const err = await get.text();
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "github_get_failed", status: get.status, detail: err.slice(0, 200) }),
    };
  }

  const newContent = existing + line;
  const putBody = {
    message: `Waitlist: ${email}`,
    content: Buffer.from(newContent, "utf8").toString("base64"),
    branch,
  };
  if (sha) putBody.sha = sha;

  const put = await fetch(url, {
    method: "PUT",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify(putBody),
  });

  if (!put.ok) {
    const err = await put.text();
    return { statusCode: 500, body: JSON.stringify({ error: "github_put_failed", status: put.status, detail: err.slice(0, 300) }) };
  }

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ok: true }),
  };
};
