Waitlist -> CSV in GitHub (private, not on the public site)
===========================================================

The landing form POSTs (via JavaScript) to BOTH Netlify Forms (/) and the
collect-waitlist serverless function. The CSV is updated in
a *separate* GitHub repository via the GitHub API. The token only exists in
Netlify environment variables, never in the static files.

Requirements
------------
- Deploy the landing site to Netlify (so /.netlify/functions/* runs).
- Create a *private* GitHub repository to hold the CSV (recommended) OR use
  a public repo but the CSV path will be visible in that repo—private is best
  for name/email.

GitHub: personal access token
---------------------------
- Fine-grained PAT: repository access to your data repo, "Contents" Read and write.
- Or classic PAT: "repo" scope (if the data repo is private).

Netlify: Site settings -> Environment variables
------------------------------------------------
- GITHUB_TOKEN   = the PAT (sensitive: never commit it)
- GITHUB_REPO    = owner/repo  e.g. myorg/bgt-waitlist-data
- (optional) GITHUB_CSV_PATH = data/waitlist.csv  (default if omitted)
- (optional) GITHUB_BRANCH  = main              (default if omitted)
- (optional) ALLOWED_ORIGIN   = https://your-site.netlify.app
  (restricts the function to form posts from that origin; recommended in production)

After deploy, submissions append rows:
  name,email,submitted_at
with RFC3339 time. First write creates a header row.

Local development
-----------------
Run: npx netlify dev
and open the URL it prints. Load the same GITHUB_* vars in a .env file in the
project root (Netlify CLI loads it) or pass env another way. Do not commit .env.

The CSV is not in this repo and is not part of the published static files
(publish = "." in netlify.toml only deploys the site; it does not expose the
data repo on the web app).
