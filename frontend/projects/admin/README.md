# admin

Admin: the application the people who review use (ADR 0028). It is built, served and deployed on
its own, on its own origin, and holds the review queue, Admin's sign-in page and its forbidden
page. `rent` never imports it, and it never imports `rent`.

- Serve: `npm run start:admin` (http://localhost:4300, `/api/` proxied to the backend on 5080).
- Build: `npm run build:admin`, into `dist/admin/browser`.
- `public/config.json` holds the site's address (`siteUrl`), which the deployment replaces
  without a rebuild; `public/robots.txt` keeps Admin out of search engines.

Depends on `@rent/shell`, `@rent/components`, `@rent/api` and `@rent/domain`.
