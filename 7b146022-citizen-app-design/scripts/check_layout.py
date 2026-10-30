#!/usr/bin/env python3
"""Renders every page at 360 px wide in light and dark with headless Chrome; fails on horizontal scroll. Saves screenshots to docs/screens/."""
import os, sys, json
from playwright.sync_api import sync_playwright
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
S = ["first-run", "lobby", "chat", "services", "wallet", "settings"]
pages = ["index", "design-system"] + S + [f"ar/{s}" for s in S]
os.makedirs(f"{R}/docs/screens", exist_ok=True)
bad, report = [], []
with sync_playwright() as p:
    b = p.chromium.launch(channel="chrome") if os.path.exists("/usr/bin/google-chrome") else p.chromium.launch()
    for scheme in ("light", "dark"):
        ctx = b.new_context(viewport={"width": 360, "height": 780}, color_scheme=scheme, device_scale_factor=1)
        pg = ctx.new_page()
        for name in pages:
            pg.goto(f"file://{R}/prototype/{name}.html")
            w = pg.evaluate("document.documentElement.scrollWidth")
            bgc = pg.evaluate("getComputedStyle(document.body).backgroundColor")
            report.append({"page": name, "scheme": scheme, "scrollWidth": w, "body_bg": bgc})
            if w > 360: bad.append(f"{name} {scheme}: scrollWidth {w}")
            if name in ("lobby", "ar/lobby", "chat", "wallet", "design-system"):
                pg.screenshot(path=f"{R}/docs/screens/{name.replace('/', '-')}-{scheme}.png", full_page=True)
        ctx.close()
    b.close()
json.dump(report, open(f"{R}/docs/layout-report.json", "w"), indent=1)
print("\n".join(bad) or f"ok: {len(report)} renders at 360 px, no horizontal scroll")
sys.exit(1 if bad else 0)
