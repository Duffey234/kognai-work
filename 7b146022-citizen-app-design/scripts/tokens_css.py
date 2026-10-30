#!/usr/bin/env python3
"""tokens/tokens.json -> tokens/tokens.css (light by default, dark under prefers-color-scheme and [data-theme="dark"])."""
import json, os
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
t = json.load(open(f"{R}/tokens/tokens.json"))
def colors(theme): return "\n".join(f"  --color-{k}: {v};" for k, v in t["color"][theme].items())
rest = []
rest.append(f'  --font-family: {t["type"]["family"]};')
rest.append(f'  --font-family-arabic: {t["type"]["family-arabic"]};')
for k, v in t["type"]["size"].items(): rest.append(f"  --font-size-{k}: {v};")
for k, v in t["type"]["weight"].items(): rest.append(f"  --font-weight-{k}: {v};")
for k, v in t["type"]["line-height"].items(): rest.append(f"  --line-height-{k}: {v};")
for k, v in t["space"].items(): rest.append(f"  --space-{k}: {v};")
for k, v in t["radius"].items(): rest.append(f"  --radius-{k}: {v};")
css = f"""/* Generated from tokens.json by scripts/tokens_css.py. Light by default; dark under prefers-color-scheme: dark and [data-theme="dark"]. */
:root {{
  color-scheme: light dark;
{colors("light")}
{chr(10).join(rest)}
}}
@media (prefers-color-scheme: dark) {{
  :root:not([data-theme="light"]) {{
{chr(10).join("  " + l for l in colors("dark").splitlines())}
  }}
}}
[data-theme="dark"] {{
{colors("dark")}
}}
[data-theme="light"] {{
{colors("light")}
}}
"""
open(f"{R}/tokens/tokens.css", "w").write(css)
print("tokens.css written")
