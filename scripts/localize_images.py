#!/usr/bin/env python3
"""Download every remote image used by the site into assets/img/ and rewrite the
HTML so the site no longer depends on Blogger. Safe to re-run; images that fail
to download keep their original URL so nothing breaks."""
import argparse, hashlib, mimetypes, pathlib, re, sys, time, urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
IMG = ROOT / "assets" / "img"
EXT = {"image/jpeg": ".jpg", "image/png": ".png", "image/gif": ".gif",
       "image/webp": ".webp", "image/svg+xml": ".svg", "image/avif": ".avif"}

def fetch(url, tries=3):
    last = None
    for n in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (site-localizer)"})
            with urllib.request.urlopen(req, timeout=30) as r:
                ctype = r.headers.get_content_type()
                data = r.read()
            if not ctype.startswith("image/") or not data:
                raise ValueError("not an image (%s, %d bytes)" % (ctype, len(data)))
            return data, ctype
        except Exception as e:
            last = e; time.sleep(1.5 * (n + 1))
    raise last

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--host-regex", default=r"https://blogger\.googleusercontent\.com/[^\s'\"<>)]+")
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()
    pat = re.compile(a.host_regex)
    pages = sorted(ROOT.glob("*.html")) + sorted((ROOT / "p").glob("*.html"))
    urls = sorted({u for p in pages for u in pat.findall(p.read_text(encoding="utf-8"))})
    print("%d unique remote images in %d pages" % (len(urls), len(pages)))
    if a.dry_run:
        return 0
    IMG.mkdir(parents=True, exist_ok=True)
    done, failed = {}, []
    for i, u in enumerate(urls, 1):
        stem = hashlib.sha1(u.encode()).hexdigest()[:12]
        existing = next(IMG.glob(stem + ".*"), None)
        if existing:
            done[u] = existing.name; continue
        try:
            data, ctype = fetch(u)
            name = stem + (EXT.get(ctype) or mimetypes.guess_extension(ctype) or ".img")
            (IMG / name).write_bytes(data)
            done[u] = name
            print("[%d/%d] ok   %s" % (i, len(urls), name))
        except Exception as e:
            failed.append(u)
            print("[%d/%d] FAIL %s (%s)" % (i, len(urls), u[-50:], e))
    for p in pages:
        prefix = "assets/img/" if p.parent == ROOT else "../assets/img/"
        t = p.read_text(encoding="utf-8")
        t = pat.sub(lambda m: prefix + done[m.group(0)] if m.group(0) in done else m.group(0), t)
        p.write_text(t, encoding="utf-8")
    print("localized %d, failed %d" % (len(done), len(failed)))
    return 0

if __name__ == "__main__":
    sys.exit(main())
