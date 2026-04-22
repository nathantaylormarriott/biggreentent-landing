Waitlist data — no GitHub token required (recommended)
======================================================

The live form submits to Netlify Forms only. Nothing sensitive is stored in this
repo or in static files.

After deploy:
  Site configuration → Forms → select form “waitlist”

You can view every submission there and download as CSV from the Netlify UI.
Optional: enable email or Slack notifications per submission in Netlify.

No environment variables are required for this path.


Optional: append rows to a CSV in GitHub (needs a GitHub PAT)
=============================================================

GitHub does not allow writing files without credentials. To mirror submissions
into a repo automatically, use `netlify/functions/collect-waitlist.mjs` and set
Netlify env vars (GITHUB_TOKEN, GITHUB_REPO, …) — then wire the client to POST
to `/.netlify/functions/collect-waitlist` in addition to `/`, or only to the
function. See that file’s header comment for details.

Alternatives without maintaining a PAT in Netlify:
  • Zapier / Make: “Netlify form submission” → Google Sheets or another tool
  • Export CSV periodically from Netlify Forms (above)
