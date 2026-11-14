# S.Kumar & Associates website

Static site hosted on **GitHub Pages**. No build step, no Blogger.

```
index.html            homepage
p/*.html              project category pages (same URLs as the old Blogger site)
404.html
assets/style.css, main.js
assets/img/           project photos (in the repo) + other images copied in by the action
scripts/localize_images.py
.github/workflows/    pages.yml (deploy) + localize-images.yml (one-time image copy)
```

## Go live
1. Create a GitHub repo and push these files to `main`.
2. Settings -> Pages -> Source: **GitHub Actions**.
3. Actions tab -> **Copy images into the repo** -> Run workflow. This downloads all
   images from Blogger into `assets/img/`, commits them and redeploys. After this the
   site no longer depends on Blogger at all.
4. Custom domain: Settings -> Pages -> Custom domain, or add a `CNAME` file with the
   domain, and point DNS at GitHub Pages.

You can also run `python scripts/localize_images.py` on your own computer instead of step 3.

## Pages
About, Process, Join Us and Disclaimer pages are in `p/`. Their text comes from the old Blogger pages; the process page was rebuilt from the original process diagram (six phases, architect vs client steps).

## SEO & icons
- Every page has its own title, description, canonical URL, Open Graph / Twitter tags; the homepage carries `ArchitecturalFirm` structured data, inner pages carry breadcrumbs.
- `sitemap.xml` and `robots.txt` assume the site lives at https://www.ska-architects.com — edit them if the domain changes.
- Favicon set (`favicon.svg/.ico`, PNGs, `apple-touch-icon.png`), `site.webmanifest` and the share image `assets/og-image.jpg` are generated; replace them with the official logo artwork when available.
- After going live, add the site in Google Search Console and submit `https://www.ska-architects.com/sitemap.xml`.
