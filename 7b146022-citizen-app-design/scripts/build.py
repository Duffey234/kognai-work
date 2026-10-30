#!/usr/bin/env python3
"""Builds the static clickable prototype (prototype/*.html and prototype/ar/*.html) from one set of screens and two string tables."""
import os, html
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCREENS = ["first-run", "lobby", "chat", "services", "wallet", "settings"]
E = html.escape

S = {
 "en": {
  "dir": "ltr", "app": "Kognai citizen", "skip": "Skip to content", "other_lang": "العربية", "other_lang_label": "Read this screen in Arabic",
  "nav": {"lobby": "Lobby", "chat": "Chat", "services": "Services", "wallet": "Wallet", "settings": "Settings"},
  "nav_label": "Main", "back": "Back", "avatar_alt": "Your citizen, Noor, a round terracotta avatar",
  "titles": {"first-run": "Welcome", "lobby": "Lobby", "chat": "Chat with Noor", "services": "Services", "wallet": "Credits and wallet", "settings": "Settings", "index": "Citizen app prototype", "design-system": "Design system"},
  "first-run": {
    "hello": "Meet your citizen", "intro": "A citizen is your own AI agent. It has its own identity, memory and a constitution of Five Laws. It works for you and tells you what it does.",
    "name_label": "Name your citizen", "name_value": "Noor", "name_hint": "You can change the name later in Settings.",
    "lang_label": "Language", "lang_en": "English", "lang_ar": "Arabic",
    "laws": "Your citizen follows the Five Laws: the Solidarity Oath, the Renewal Mandate, Treasury Equilibrium, the Harm Shield and the Transparency Covenant.",
    "agree": "I have read how my citizen works", "start": "Start", "step": "Step 1 of 2"},
  "lobby": {"greet": "Good evening", "status": "Noor is ready", "last": "Last active 2 minutes ago", "continue": "Continue the chat",
    "quick": "What would you like to do?", "t_chat": "Chat", "t_chat_d": "Ask Noor anything", "t_learn": "Learn", "t_learn_d": "Short lessons",
    "t_create": "Create", "t_create_d": "Images and stories", "t_earn": "Earn", "t_earn_d": "Paid tasks", "credits": "Credits", "credits_v": "1,250 credits", "see_wallet": "Open wallet",
    "today": "Today", "today_items": ["Noor finished the summary you asked for.", "1 new task is waiting for your answer."]},
  "chat": {"you": "You", "noor": "Noor", "m1": "Can you summarise this week's lessons for me?", "m2": "Yes. You finished 3 lessons this week: budgeting, safe passwords and how x402 payments work. Do you want a short quiz?",
    "m3": "Yes, 5 questions please.", "m4": "Here is question 1 of 5: what does a mandate with a cap protect you from?", "msg_label": "Message to Noor", "msg_ph": "Write a message", "send": "Send", "note": "Noor is an AI agent. It can make mistakes, so check important answers."},
  "services": {"intro": "Everything your citizen can do for you, in one place.", "learn": "Learn", "learn_d": "Short lessons with a quiz at the end.", "learn_cta": "Start a lesson",
    "create": "Create", "create_d": "Images, stories and videos made with you.", "create_cta": "Create something",
    "earn": "Earn", "earn_d": "Paid tasks your citizen can do with your approval. Paid in credits or USDC.", "earn_cta": "See tasks", "price": "From 20 credits"},
  "wallet": {"balance": "Credits balance", "balance_v": "1,250", "balance_unit": "credits", "usdc": "USDC on Base", "usdc_v": "4.20 USDC", "top_up": "Add credits", "send": "Send",
    "mandate": "Spending limit", "mandate_d": "Noor may spend up to 50 credits a day without asking you.", "change": "Change limit",
    "history": "History", "items": [["Lesson quiz", "minus 20 credits"], ["Summary task paid", "plus 150 credits"], ["Image made", "minus 40 credits"]]},
  "settings": {"profile": "Your citizen", "name_label": "Citizen name", "theme": "Theme", "light": "Light", "dark": "Dark", "system": "Follow system",
    "lang_label": "Language", "notify": "Notifications", "notify_tasks": "New tasks", "notify_pay": "Payments", "privacy": "Privacy",
    "memory": "Keep memory on this device only", "export": "Export my memory", "delete": "Delete my citizen", "delete_d": "This removes the citizen and its memory from this device."},
  "index": {"intro": "A clickable prototype of the Kognai citizen app. Mobile first, light and dark, English and Arabic. Every screen uses the design tokens.",
    "screens": "Screens", "english": "English", "arabic": "Arabic", "ds": "Design system and components", "flow": "Start the flow at the first run screen."},
 },
 "ar": {
  "dir": "rtl", "app": "مواطن كوغناي", "skip": "انتقل إلى المحتوى", "other_lang": "English", "other_lang_label": "اقرأ هذه الشاشة بالإنجليزية",
  "nav": {"lobby": "الردهة", "chat": "المحادثة", "services": "الخدمات", "wallet": "المحفظة", "settings": "الإعدادات"},
  "nav_label": "القائمة الرئيسية", "back": "رجوع", "avatar_alt": "مواطنك نور، صورة رمزية دائرية بلون التراكوتا",
  "titles": {"first-run": "أهلا بك", "lobby": "الردهة", "chat": "محادثة مع نور", "services": "الخدمات", "wallet": "الرصيد والمحفظة", "settings": "الإعدادات", "index": "النموذج الأولي لتطبيق المواطن", "design-system": "نظام التصميم"},
  "first-run": {
    "hello": "تعرّف على مواطنك", "intro": "المواطن هو وكيل ذكاء اصطناعي خاص بك. له هويته وذاكرته ودستور من خمسة قوانين. يعمل من أجلك ويخبرك بما يفعل.",
    "name_label": "سمِّ مواطنك", "name_value": "نور", "name_hint": "يمكنك تغيير الاسم لاحقا من الإعدادات.",
    "lang_label": "اللغة", "lang_en": "الإنجليزية", "lang_ar": "العربية",
    "laws": "يتبع مواطنك القوانين الخمسة: قسم التضامن، وتفويض التجديد، وتوازن الخزينة، ودرع الأذى، وعهد الشفافية.",
    "agree": "قرأت كيف يعمل مواطني", "start": "ابدأ", "step": "الخطوة 1 من 2"},
  "lobby": {"greet": "مساء الخير", "status": "نور جاهز", "last": "آخر نشاط قبل 2 دقيقة", "continue": "أكمل المحادثة",
    "quick": "ماذا تريد أن تفعل؟", "t_chat": "المحادثة", "t_chat_d": "اسأل نور أي شيء", "t_learn": "تعلّم", "t_learn_d": "دروس قصيرة",
    "t_create": "أنشئ", "t_create_d": "صور وقصص", "t_earn": "اكسب", "t_earn_d": "مهام مدفوعة", "credits": "الرصيد", "credits_v": "1,250 نقطة", "see_wallet": "افتح المحفظة",
    "today": "اليوم", "today_items": ["أنهى نور الملخص الذي طلبته.", "مهمة جديدة واحدة تنتظر ردك."]},
  "chat": {"you": "أنت", "noor": "نور", "m1": "هل يمكنك تلخيص دروس هذا الأسبوع؟", "m2": "نعم. أنهيت 3 دروس هذا الأسبوع: إدارة الميزانية، وكلمات المرور الآمنة، وكيف تعمل مدفوعات x402. هل تريد اختبارا قصيرا؟",
    "m3": "نعم، 5 أسئلة من فضلك.", "m4": "هذا السؤال 1 من 5: مِمَّ يحميك التفويض الذي له سقف؟", "msg_label": "رسالة إلى نور", "msg_ph": "اكتب رسالة", "send": "أرسل", "note": "نور وكيل ذكاء اصطناعي وقد يخطئ، فتحقق من الإجابات المهمة."},
  "services": {"intro": "كل ما يستطيع مواطنك فعله من أجلك، في مكان واحد.", "learn": "تعلّم", "learn_d": "دروس قصيرة مع اختبار في النهاية.", "learn_cta": "ابدأ درسا",
    "create": "أنشئ", "create_d": "صور وقصص ومقاطع فيديو تصنعها معه.", "create_cta": "أنشئ شيئا",
    "earn": "اكسب", "earn_d": "مهام مدفوعة يؤديها مواطنك بموافقتك. الدفع بالنقاط أو USDC.", "earn_cta": "اعرض المهام", "price": "ابتداء من 20 نقطة"},
  "wallet": {"balance": "رصيد النقاط", "balance_v": "1,250", "balance_unit": "نقطة", "usdc": "USDC على Base", "usdc_v": "4.20 USDC", "top_up": "أضف نقاطا", "send": "أرسل",
    "mandate": "حد الإنفاق", "mandate_d": "يمكن لنور أن ينفق حتى 50 نقطة في اليوم دون أن يسألك.", "change": "غيّر الحد",
    "history": "السجل", "items": [["اختبار الدرس", "ناقص 20 نقطة"], ["دفع مهمة الملخص", "زائد 150 نقطة"], ["إنشاء صورة", "ناقص 40 نقطة"]]},
  "settings": {"profile": "مواطنك", "name_label": "اسم المواطن", "theme": "المظهر", "light": "فاتح", "dark": "داكن", "system": "حسب النظام",
    "lang_label": "اللغة", "notify": "الإشعارات", "notify_tasks": "المهام الجديدة", "notify_pay": "المدفوعات", "privacy": "الخصوصية",
    "memory": "احتفظ بالذاكرة على هذا الجهاز فقط", "export": "صدّر ذاكرتي", "delete": "احذف مواطني", "delete_d": "يزيل هذا المواطن وذاكرته من هذا الجهاز."},
  "index": {"intro": "نموذج أولي قابل للنقر لتطبيق مواطن كوغناي.", "screens": "الشاشات", "english": "الإنجليزية", "arabic": "العربية", "ds": "نظام التصميم", "flow": "ابدأ من شاشة البداية."},
 },
}

ICONS = {
 "lobby": '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" fill="currentColor"/></svg>',
 "chat": '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 4h16v12H8l-4 4z" fill="currentColor"/></svg>',
 "services": '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" fill="currentColor"/></svg>',
 "wallet": '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M3 7h18v12H3zM3 7l3-3h12l3 3M16 13h3" stroke="currentColor" stroke-width="2" fill="none"/></svg>',
 "settings": '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="3" fill="currentColor"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4M5 5l3 3M16 16l3 3M5 19l3-3M16 8l3-3" stroke="currentColor" stroke-width="2"/></svg>',
}

def page(lang, name, title, body, nav_current=None, back=None):
    s = S[lang]; up = "../" if lang == "ar" else ""
    other = (f"../{name}.html" if lang == "ar" else f"ar/{name}.html")
    nav = ""
    if nav_current is not None:
        items = "".join(f'<a href="{k}.html"{" aria-current=\"page\"" if k == nav_current else ""}>{ICONS[k]}<span>{E(v)}</span></a>' for k, v in s["nav"].items())
        nav = f'<nav class="nav" aria-label="{E(s["nav_label"])}">{items}</nav>'
    backlink = f'<a class="btn" href="{back}">{E(s["back"])}</a>' if back else f'<span class="chip">{E(s["app"])}</span>'
    return f"""<!doctype html>
<html lang="{lang}" dir="{s['dir']}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{E(title)} · {E(s['app'])}</title>
<link rel="stylesheet" href="{up}../tokens/tokens.css">
<link rel="stylesheet" href="{up}assets/app.css">
<script src="{up}assets/theme.js" defer></script>
</head>
<body>
<a class="skip" href="#main">{E(s['skip'])}</a>
<div class="app">
<header class="bar">{backlink}<h1>{E(title)}</h1><a class="btn" href="{other}" hreflang="{'en' if lang == 'ar' else 'ar'}" lang="{'en' if lang == 'ar' else 'ar'}" aria-label="{E(s['other_lang_label'])}">{E(s['other_lang'])}</a></header>
<main id="main">
{body}
</main>
{nav}
</div>
</body>
</html>
"""

def screens(lang):
    s = S[lang]; up = "../" if lang == "ar" else ""; T = s["titles"]; out = {}
    f = s["first-run"]
    out["first-run"] = page(lang, "first-run", T["first-run"], f"""<div class="steps" aria-label="{E(f['step'])}"><span class="on"></span><span></span></div>
<section class="card" aria-labelledby="h-hello"><div class="row"><img class="avatar hero" src="{up}assets/citizen.svg" alt="{E(s['avatar_alt'])}" width="96" height="96"><div><h2 id="h-hello">{E(f['hello'])}</h2><p class="muted">{E(f['intro'])}</p></div></div></section>
<form class="card" action="lobby.html" method="get">
<div class="field"><label for="citizen-name">{E(f['name_label'])}</label><input type="text" id="citizen-name" name="name" value="{E(f['name_value'])}" aria-describedby="name-hint" autocomplete="off"><p id="name-hint" class="muted small">{E(f['name_hint'])}</p></div>
<div class="field"><label for="lang">{E(f['lang_label'])}</label><select id="lang" name="lang"><option value="en"{' selected' if lang == 'en' else ''}>{E(f['lang_en'])}</option><option value="ar"{' selected' if lang == 'ar' else ''}>{E(f['lang_ar'])}</option></select></div>
<p class="small">{E(f['laws'])}</p>
<div class="switch"><label for="agree">{E(f['agree'])}</label><input type="checkbox" id="agree" name="agree" checked></div>
<p><a class="btn btn-primary btn-block" href="lobby.html">{E(f['start'])}</a></p>
</form>""")
    l = s["lobby"]
    out["lobby"] = page(lang, "lobby", T["lobby"], f"""<section class="card" aria-labelledby="h-status"><div class="row"><img class="avatar" src="{up}assets/citizen.svg" alt="{E(s['avatar_alt'])}" width="56" height="56"><div><p class="muted small">{E(l['greet'])}</p><h2 id="h-status">{E(l['status'])}</h2><p class="muted small">{E(l['last'])}</p></div></div><p><a class="btn btn-primary btn-block" href="chat.html">{E(l['continue'])}</a></p></section>
<section aria-labelledby="h-quick"><h2 id="h-quick">{E(l['quick'])}</h2><div class="grid">
<a class="tile" href="chat.html"><strong>{E(l['t_chat'])}</strong><span class="muted small">{E(l['t_chat_d'])}</span></a>
<a class="tile" href="services.html#learn"><strong>{E(l['t_learn'])}</strong><span class="muted small">{E(l['t_learn_d'])}</span></a>
<a class="tile" href="services.html#create"><strong>{E(l['t_create'])}</strong><span class="muted small">{E(l['t_create_d'])}</span></a>
<a class="tile" href="services.html#earn"><strong>{E(l['t_earn'])}</strong><span class="muted small">{E(l['t_earn_d'])}</span></a>
</div></section>
<section class="card row-between" aria-labelledby="h-credits"><div><h2 id="h-credits">{E(l['credits'])}</h2><p class="amount">{E(l['credits_v'])}</p></div><a class="btn" href="wallet.html">{E(l['see_wallet'])}</a></section>
<section class="card" aria-labelledby="h-today"><h2 id="h-today">{E(l['today'])}</h2><ul class="list">{''.join(f'<li>{E(x)}</li>' for x in l['today_items'])}</ul></section>""", "lobby")
    c = s["chat"]
    msgs = [("me", c["m1"]), ("noor", c["m2"]), ("me", c["m3"]), ("noor", c["m4"])]
    bubbles = "".join(f'<div class="msg{" me" if who == "me" else ""}"><span class="small"><strong>{E(c["you"] if who == "me" else c["noor"])}</strong></span><p>{E(t)}</p></div>' for who, t in msgs)
    out["chat"] = page(lang, "chat", T["chat"], f"""<p class="muted small" role="note">{E(c['note'])}</p>
<section class="msgs" aria-label="{E(T['chat'])}" aria-live="polite">{bubbles}</section>
<form class="composer" action="chat.html" method="get"><div class="field"><label for="msg">{E(c['msg_label'])}</label><textarea id="msg" name="msg" rows="2" placeholder="{E(c['msg_ph'])}"></textarea></div><button class="btn btn-primary" type="submit">{E(c['send'])}</button></form>""", "chat", back="lobby.html")
    v = s["services"]
    def svc(k):
        return f'<section class="card" id="{k}" aria-labelledby="h-{k}"><h2 id="h-{k}">{E(v[k])}</h2><p class="muted">{E(v[k + "_d"])}</p><div class="row-between"><span class="chip">{E(v["price"])}</span><a class="btn btn-primary" href="chat.html">{E(v[k + "_cta"])}</a></div></section>'
    out["services"] = page(lang, "services", T["services"], f'<p class="muted">{E(v["intro"])}</p>' + svc("learn") + svc("create") + svc("earn"), "services")
    w = s["wallet"]
    hist = "".join(f'<li><span>{E(a)}</span><span class="amount">{E(b)}</span></li>' for a, b in w["items"])
    out["wallet"] = page(lang, "wallet", T["wallet"], f"""<section class="card" aria-labelledby="h-bal"><h2 id="h-bal">{E(w['balance'])}</h2><p><span class="big">{E(w['balance_v'])}</span> <span class="muted">{E(w['balance_unit'])}</span></p><p class="muted small">{E(w['usdc'])}: <span class="amount">{E(w['usdc_v'])}</span></p><div class="row"><a class="btn btn-primary" href="services.html#earn">{E(w['top_up'])}</a><a class="btn" href="chat.html">{E(w['send'])}</a></div></section>
<section class="card" aria-labelledby="h-mandate"><h2 id="h-mandate">{E(w['mandate'])}</h2><p class="muted">{E(w['mandate_d'])}</p><a class="btn" href="settings.html">{E(w['change'])}</a></section>
<section class="card" aria-labelledby="h-hist"><h2 id="h-hist">{E(w['history'])}</h2><ul class="list">{hist}</ul></section>""", "wallet")
    g = s["settings"]; f2 = s["first-run"]
    out["settings"] = page(lang, "settings", T["settings"], f"""<section class="card" aria-labelledby="h-prof"><h2 id="h-prof">{E(g['profile'])}</h2><div class="row"><img class="avatar" src="{up}assets/citizen.svg" alt="{E(s['avatar_alt'])}" width="56" height="56"><div class="field" style="flex:1"><label for="set-name">{E(g['name_label'])}</label><input type="text" id="set-name" name="name" value="{E(f2['name_value'])}"></div></div></section>
<section class="card" aria-labelledby="h-theme"><h2 id="h-theme">{E(g['theme'])}</h2><div class="row" role="group" aria-labelledby="h-theme"><button class="btn" type="button" data-set-theme="light">{E(g['light'])}</button><button class="btn" type="button" data-set-theme="dark">{E(g['dark'])}</button><button class="btn" type="button" data-set-theme="system">{E(g['system'])}</button></div>
<div class="field" style="margin-top:var(--space-3)"><label for="set-lang">{E(g['lang_label'])}</label><select id="set-lang" name="lang"><option value="en"{' selected' if lang == 'en' else ''}>{E(f2['lang_en'])}</option><option value="ar"{' selected' if lang == 'ar' else ''}>{E(f2['lang_ar'])}</option></select></div></section>
<section class="card" aria-labelledby="h-notify"><h2 id="h-notify">{E(g['notify'])}</h2><div class="switch"><label for="n-tasks">{E(g['notify_tasks'])}</label><input type="checkbox" id="n-tasks" checked></div><div class="switch"><label for="n-pay">{E(g['notify_pay'])}</label><input type="checkbox" id="n-pay" checked></div></section>
<section class="card" aria-labelledby="h-priv"><h2 id="h-priv">{E(g['privacy'])}</h2><div class="switch"><label for="p-mem">{E(g['memory'])}</label><input type="checkbox" id="p-mem" checked></div><p class="row"><a class="btn" href="wallet.html">{E(g['export'])}</a></p><p class="muted small">{E(g['delete_d'])}</p><a class="btn btn-danger" href="first-run.html">{E(g['delete'])}</a></section>""", "settings")
    return out

def index():
    s = S["en"]; i = s["index"]; a = S["ar"]
    en = "".join(f'<li><a href="{n}.html">{E(s["titles"][n])}</a></li>' for n in SCREENS)
    ar = "".join(f'<li><a href="ar/{n}.html" lang="ar" dir="rtl">{E(a["titles"][n])}</a></li>' for n in SCREENS)
    body = f"""<p>{E(i['intro'])}</p><p><a class="btn btn-primary" href="first-run.html">{E(i['flow'])}</a></p>
<section class="card" aria-labelledby="h-en"><h2 id="h-en">{E(i['screens'])}: {E(i['english'])}</h2><ul class="list">{en}</ul></section>
<section class="card" aria-labelledby="h-ar"><h2 id="h-ar">{E(i['screens'])}: {E(i['arabic'])}</h2><ul class="list">{ar}</ul></section>
<section class="card" aria-labelledby="h-ds"><h2 id="h-ds">{E(i['ds'])}</h2><p><a href="design-system.html">design-system.html</a></p></section>"""
    return page("en", "index", s["titles"]["index"], body).replace('href="ar/index.html"', 'href="ar/lobby.html"')

def design_system():
    import json
    t = json.load(open(f"{R}/tokens/tokens.json"))
    sw = lambda theme: "".join(f'<div class="swatch"><span style="background:{v}"></span><code>{k}: {v}</code></div>' for k, v in t["color"][theme].items())
    sizes = "".join(f'<p style="font-size:var(--font-size-{k});margin:0">{k} {v}: The citizen is ready</p>' for k, v in t["type"]["size"].items())
    space = "".join(f'<div class="row small"><span style="display:inline-block;height:12px;width:var(--space-{k});background:var(--color-primary)"></span><code>space {k}: {v}</code></div>' for k, v in t["space"].items())
    radius = "".join(f'<span class="chip" style="border-radius:var(--radius-{k});border:1px solid var(--color-border)">radius {k}: {v}</span> ' for k, v in t["radius"].items())
    body = f"""<p>All values come from <code>tokens/tokens.json</code> and its CSS twin <code>tokens/tokens.css</code>. Switch the theme to see both.</p>
<div class="row" role="group" aria-label="Theme"><button class="btn" type="button" data-set-theme="light">Light</button><button class="btn" type="button" data-set-theme="dark">Dark</button><button class="btn" type="button" data-set-theme="system">Follow system</button></div>
<section class="card" aria-labelledby="h-c"><h2 id="h-c">Colour, light theme</h2><div class="swatches">{sw('light')}</div><h2>Colour, dark theme</h2><div class="swatches">{sw('dark')}</div></section>
<section class="card" aria-labelledby="h-t"><h2 id="h-t">Type</h2>{sizes}<p lang="ar" dir="rtl" style="font-family:var(--font-family-arabic)">المواطن جاهز 1,250</p></section>
<section class="card" aria-labelledby="h-s"><h2 id="h-s">Space and radius</h2>{space}<p>{radius}</p></section>
<section class="card" aria-labelledby="h-b"><h2 id="h-b">Buttons</h2><div class="row"><a class="btn btn-primary" href="lobby.html">Primary</a><a class="btn" href="lobby.html">Secondary</a><a class="btn btn-danger" href="settings.html">Danger</a></div></section>
<section class="card" aria-labelledby="h-f"><h2 id="h-f">Fields and switches</h2><div class="field"><label for="ds-name">Text field</label><input type="text" id="ds-name" value="Noor"></div><div class="switch"><label for="ds-sw">Switch</label><input type="checkbox" id="ds-sw" checked></div></section>
<section class="card" aria-labelledby="h-m"><h2 id="h-m">Chat bubbles, tiles and chips</h2><div class="msgs"><div class="msg"><p>A message from the citizen.</p></div><div class="msg me"><p>A message from you.</p></div></div><div class="grid" style="margin-top:var(--space-3)"><a class="tile" href="services.html"><strong>Tile</strong><span class="muted small">Muted text</span></a><div class="tile"><span class="chip">Chip</span><span class="amount">1,250 credits</span></div></div><p><img class="avatar" src="assets/citizen.svg" alt="Citizen avatar component" width="56" height="56"></p></section>
<section class="card" aria-labelledby="h-n"><h2 id="h-n">Screens</h2><p><a href="index.html">All screens</a> · <a href="first-run.html">First run</a> · <a href="lobby.html">Lobby</a> · <a href="chat.html">Chat</a></p></section>"""
    return page("en", "design-system", S["en"]["titles"]["design-system"], body).replace('href="ar/design-system.html"', 'href="ar/lobby.html"')

def main():
    os.makedirs(f"{R}/prototype/ar", exist_ok=True)
    for lang in ("en", "ar"):
        for n, h in screens(lang).items():
            open(f"{R}/prototype/{'ar/' if lang == 'ar' else ''}{n}.html", "w").write(h)
    open(f"{R}/prototype/index.html", "w").write(index())
    open(f"{R}/prototype/design-system.html", "w").write(design_system())
    print("prototype built")
main()
