# Frontend on cPanel

Target URL: https://stock.pstu.ac.bd/

Backend: https://pstu-inventory-management-system-with-ywv1.onrender.com

## Central API configuration

Edit `lib/api.ts` to manage the backend origin and all endpoint paths. Pages use `API_ROUTES.items.list`, `API_ROUTES.users.login`, or dynamic functions such as `API_ROUTES.items.getById(id)`. Changing a route or backend address requires rebuilding the static site; individual pages do not need URL edits.

## Upload the prepared package

1. Open cPanel > Domains and locate the main domain `stock.pstu.ac.bd`.
2. Click the document root shown for this domain to open File Manager. For this account it is `/public_html`.
3. Back up any existing site files in that folder before replacing them.
4. Upload `pstu-frontend-central-routes.zip` and extract it directly into the document root.
5. Confirm `index.html`, `.htaccess`, `_next/`, `login/`, `admin/`, and `user/` are directly inside the document root, with no extra `out/` folder. Enable File Manager's Show Hidden Files option to see `.htaccess`.
6. Remove the uploaded ZIP after extracting it. Enable SSL for this domain using your hosting provider's certificate tools.
7. Open `https://stock.pstu.ac.bd/` and `/login/`. Refresh `/login/` directly to check folder routing. Then sign in with your existing account and check inventory loading.

This is a static Next.js export. There is no Node.js process to start on cPanel and no database credentials to upload. The browser calls the Render backend directly. Never upload `.env`, `node_modules`, or backend source files to the public folder.

## Rebuild in Windows PowerShell

Run from the repository's `frontend` folder:

```powershell
npm.cmd ci --legacy-peer-deps
$env:NEXT_PUBLIC_API_URL = "https://pstu-inventory-management-system-with-ywv1.onrender.com"
npm.cmd run build
```

Upload the contents of the resulting `out` folder. The API URL is a public origin without `/api`, and is embedded at build time; changing it requires a rebuild. `--legacy-peer-deps` is currently needed for the existing React/date-picker peer-dependency conflict.

The build uses `output: 'export'` and `trailingSlash: true`, producing directory `index.html` files for routes. Do not add a generic rewrite that sends every request to the homepage.

## Troubleshooting

- Wrong site or default hosting page: check the domain's document root and DNS.
- Missing styling: confirm `_next/` was extracted at the root and clear the browser cache.
- Page works via navigation but fails on refresh: confirm its folder contains `index.html` and `.htaccess` is present.
- HTTP 500 immediately after upload: inspect the cPanel error log; some hosts restrict `Options` in `.htaccess` and require the host to enable it or remove that directive.
- Login or inventory request fails: check the browser Network panel and Render logs. The API health endpoint should return HTTP 200 with `db: connected`.

References: https://docs.cpanel.net/cpanel/domains/domains/ and https://nextjs.org/docs/app/guides/static-exports
