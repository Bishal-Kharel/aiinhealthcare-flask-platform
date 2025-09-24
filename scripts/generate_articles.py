# generate_articles.py — APPEND 20 NEW TOPICS (no deletes), DB-free, UI-ready

import os, json, re, requests, html, time, random
from datetime import datetime, timezone
from pathlib import Path
from dotenv import load_dotenv
from urllib.parse import quote  # used elsewhere if needed

load_dotenv()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
assert OPENAI_API_KEY, "Set OPENAI_API_KEY in your .env"

BASE_URL = "https://api.openai.com/v1/chat/completions"
REQUEST_TIMEOUT = int(os.getenv("OPENAI_TIMEOUT_SECS", "180"))

BASE_DIR = Path(__file__).parent.parent


TPL_OUT_DIR = BASE_DIR / "templates/articles"
TPL_OUT_DIR.mkdir(parents=True, exist_ok=True)

# JSON manifest for /api/articles
OUT_DIR = BASE_DIR / "static/blog"
OUT_DIR.mkdir(parents=True, exist_ok=True)
MANIFEST_PATH = OUT_DIR / "index.json"


NANIZE_SAFER_HEALTHIER = [
    # keep existing & append new ones (no deletions)
    "Why Nanize is the safer option than 'Teflon' quick-fixes in hospital IT (metaphor only: governance, privacy, audit trails)",
    "What clinicians actually mean by 'less admin': practical wins Nanize can enable",
    "Why Nanize is the healthier choice than 'Teflon' shortcuts in healthcare IT (metaphor: resilience vs. fragility)",
    "Nanize and the art of slow fixes: why thoughtful change beats quick patches",
    "How Nanize helps clinicians reclaim focus without extra dashboards",
    "Why IT teams call Nanize a 'quiet ally' instead of another noisy platform",
    "Nanize vs. 'Teflon' fixes: how clarity prevents tomorrow’s rework",
    "Governance made livable: how Nanize avoids the compliance vs. speed trap",
    "Why Nanize feels lighter: small design details that add up",
    "The hidden costs of patching vs. Nanize’s path to fewer surprises",
    "What clinicians actually mean by 'less admin': practical wins Nanize can enable",
]

ABOUT_US_VISION = [
    # keep existing & append new ones (no deletions)
    "About us: Doctors Online Medical Services and how we work with clinicians",

    # NEW (About / vision / how we collaborate — no medical advice)
    "Our product philosophy: calm defaults, clear ownership, fewer clicks",

    # NEW — DoctorsOnline.shop, OpenQQuantity, leadership, and Nanize alignment
    "Introducing DoctorsOnline.shop: how a focused storefront supports clinician-friendly procurement without extra dashboards",
    "OpenQQuantity at DoctorsOnline.shop: a plain-language overview and where it fits in day-to-day operations",
    "How DoctorsOnline.shop complements Nanize: intake, triage, and lightweight workflows that avoid duplicate effort",
    "Governance-first ecommerce: audit trails, role clarity, and privacy basics at DoctorsOnline.shop",
    "From request to receipt: an end-to-end walkthrough using DoctorsOnline.shop alongside Nanize worklists",
    "Integration notes: connecting DoctorsOnline.shop catalogs and status signals into Nanize’s queues",
    "A conversation with CEO Paul Savluc: why small, reliable tools beat loud “platforms” in healthcare ops",
    "Behind the build with developer Bishal Kharel: performance budgets, constraints, and keeping the UI boring (on purpose)",
    "What we won’t do: limits, boundaries, and acceptable use at DoctorsOnline.shop to keep things safe and predictable",
    "Roadmap for DoctorsOnline.shop: APIs, OpenQQuantity improvements, and interoperability commitments with Nanize",
]


def article_prompt(topic: str, author_hint: str) -> str:
    return f"""
Return STRICT JSON only. No code fences. Do NOT include medical advice, diagnosis, or treatment instructions.
Write like a human magazine editor.

VOICE & STYLE
- 850–1100 words; mix short and long sentences (rhythm).
- Open with a small, concrete scene or problem (“cold open”), then zoom out.
- Show, don’t tell. Use specific, everyday details; keep claims cautious.
- Use contractions; strong verbs; cut filler. Avoid buzzwords.
- Banned words: leverage, cutting-edge, paradigm shift, utilize, in conclusion, as we all know.
- Structure: 2–3 subheads (<h2>/<h3>), one short bullet list, one pull-quote, and a small CTA box about “Doctors Online Medical Services” at the end.
- No fake stats or quotes.

OUTPUT JSON:
{{
  "title": "concise headline",
  "excerpt": "120–160 characters; vivid, plain, zero hype",
  "meta_description": "≤155 characters, plain",
  "author": "{author_hint}",
  "body_html": "<article>...</article>"
}}

TOPIC: {topic}

RULES:
- Treat “Teflon” strictly as a metaphor for slippery quick-fix tools; DO NOT discuss the brand/material or make product safety comparisons.
- If the topic mentions “Nanize”, keep benefits realistic (workflow clarity, time saved, governance)—not clinical outcomes.
- Avoid medical advice or instructions.
"""

def _safe_json_parse(payload_text: str) -> dict:
    """Strict JSON parse with a tiny sanitizer for stray code fences or whitespace."""
    if not isinstance(payload_text, str):
        raise ValueError("Model returned non-string content")
    cleaned = payload_text.strip()
    cleaned = re.sub(r"^```(?:json)?|```$", "", cleaned, flags=re.IGNORECASE | re.MULTILINE).strip()
    return json.loads(cleaned)

def call_openai(prompt: str) -> dict:
    """Robust call with retries, backoff, and strict JSON response_format."""
    headers = {"Authorization": f"Bearer {OPENAI_API_KEY}", "Content-Type": "application/json"}
    payload = {
        "model": MODEL,
        "messages": [
            {"role": "system", "content": "Return a single valid JSON object. Avoid medical advice. Never include markdown."},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.7,
        "response_format": {"type": "json_object"}
    }
    max_attempts = 4
    last_err = None
    for attempt in range(1, max_attempts + 1):
        try:
            r = requests.post(BASE_URL, headers=headers, json=payload, timeout=REQUEST_TIMEOUT)
            r.raise_for_status()
            content = r.json()["choices"][0]["message"]["content"]
            data = _safe_json_parse(content)
            if not isinstance(data, dict):
                raise ValueError("Model response is not a JSON object")
            for key in ("title", "excerpt", "meta_description", "author", "body_html"):
                if key not in data:
                    raise ValueError(f"Missing key in model response: {key}")
            return data
        except Exception as e:
            last_err = e
            sleep_s = (2 ** (attempt - 1)) + random.uniform(0, 0.6)
            time.sleep(sleep_s)
    raise RuntimeError(f"OpenAI call failed after {max_attempts} attempts: {last_err}")

# ---------------- Utils ----------------

def slugify(text: str) -> str:
    text = re.sub(r'[^a-zA-Z0-9\s-]', '', (text or '')).strip().lower()
    return re.sub(r'[\s-]+', '-', text) or "post"

def ensure_unique_slug(base_slug: str, used_slugs: set) -> str:
    """Find a unique slug (base, base-2, base-3, …) without touching existing pages."""
    slug = base_slug
    i = 2
    while slug in used_slugs or (TPL_OUT_DIR / f"{slug}.html").exists():
        slug = f"{base_slug}-{i}"
        i += 1
    used_slugs.add(slug)
    return slug

def write_json_atomic(path: Path, data):
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    tmp.replace(path)

def load_manifest() -> list:
    if MANIFEST_PATH.exists():
        try:
            data = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
            return data if isinstance(data, list) else []
        except Exception:
            return []
    return []

def save_manifest(items: list):
    write_json_atomic(MANIFEST_PATH, items)

def pretty_date_from_iso(iso: str) -> str:
    try:
        dt = datetime.fromisoformat(iso.replace("Z",""))
        return dt.strftime("%b %d, %Y")
    except Exception:
        return datetime.now().strftime("%b %d, %Y")

def estimate_read_minutes(html_text: str, wpm: int = 225) -> int:
    if not html_text:
        return 2
    text = re.sub(r"<[^>]+>", " ", html.unescape(html_text))
    words = len(re.findall(r"\w+", text))
    return max(2, int(round(words / float(wpm))))

def write_article_template(slug: str, post: dict, category: str):
    out_path = TPL_OUT_DIR / f"{slug}.html"

    # Safe values (escape attributes)
    raw_title = (post.get("title") or "Article").strip()
    title_attr = html.escape(raw_title, quote=True)
    meta_desc_attr = html.escape((post.get("meta_description") or post.get("excerpt") or "").strip(), quote=True)
    published = post.get("published_at") or ""
    author = (post.get("author") or "Editors").strip()
    read_minutes = int(post.get("read_minutes") or 2)
    body_html = post.get("body_html") or ""
    category_label = (category or "").title()
    cover_image = (post.get("cover_image") or "").strip()
    canonical_path = f"/articles/{slug}"

    tpl = f"""{{% extends "base.html" %}}

{{% block title %}}{title_attr} • Doctors Online{{% endblock %}}

{{% block extra_head %}}
<meta name="description" content="{meta_desc_attr}">
<link rel="canonical" href="{canonical_path}">
<meta property="og:type" content="article">
<meta property="og:title" content="{title_attr}">
<meta property="og:description" content="{meta_desc_attr}">
<meta property="og:url" content="{canonical_path}">
<meta name="twitter:card" content="summary_large_image">
{f'<meta property="og:image" content="{cover_image}">' if cover_image else ''}

<!-- Force light color scheme on this page only -->
<meta name="color-scheme" content="light">

<style>
.au-page {{
  --au-bg: #f7f8fb;
  --au-surface: #ffffff;
  --au-ink: #0f172a;
  --au-muted: #64748b;
  --au-border: #e5e7eb;
  --au-brand: #0ea5e9;
  --au-brand-2: #38bdf8;
  --au-shadow: 0 8px 30px rgba(2,6,23,.06);
  --au-r-lg: 18px;
  --au-r-md: 12px;
  --au-prose: 1.04rem;
  --au-lead: 1.12rem;

  background: linear-gradient(180deg, #ffffff 0%, var(--au-bg) 100%);
  color: var(--au-ink);
  padding-top: clamp(72px, 9vw, 96px); /* space for fixed nav from base.html */
}}

.au-wrap {{ max-width: 1120px; margin: 0 auto; padding: 0 1rem; }}

/* Back link directly under header */
.au-back {{
  padding: .75rem 0 0;
}}
.au-back a {{
  text-decoration: none; color: var(--au-ink);
  border: 1px solid var(--au-border);
  background: var(--au-surface);
  padding: .45rem .8rem; border-radius: 10px;
  display: inline-flex; align-items: center; gap:.5rem;
}}
.au-back a:hover {{ border-color: #d1d5db; }}

.au-crumbs {{
  margin-top: .8rem;
  font-size: .92rem; color: var(--au-muted); display:flex; gap:.5rem; align-items:center; flex-wrap:wrap;
}}
.au-crumbs a {{ color: inherit; text-decoration: none; }}
.au-crumbs a:hover {{ text-decoration: underline; }}

.au-header {{ padding: .6rem 0 .5rem; }}
.au-title {{
  font-size: clamp(2rem, 3.6vw, 2.8rem);
  line-height: 1.15;
  letter-spacing: -0.01em;
  margin: .5rem 0 .5rem;
}}
.au-lead {{ color: var(--au-muted); font-size: var(--au-lead); max-width: 70ch; }}
.au-meta {{
  margin-top:.6rem; color: var(--au-muted); display:flex; gap:.6rem; flex-wrap:wrap; align-items:center;
}}
.au-badge {{
  display:inline-flex; align-items:center; gap:.5rem; padding:.25rem .6rem; border:1px solid var(--au-border);
  border-radius:999px; background: var(--au-surface); font-size:.78rem; color: var(--au-muted);
}}
.au-cover {{
  margin: 1rem 0; overflow:hidden; border-radius: var(--au-r-lg);
  border:1px solid var(--au-border); box-shadow: var(--au-shadow);
}}
.au-cover img {{ width:100%; height:auto; display:block; }}

.au-article-wrap {{
  display: flex; justify-content: center;
  padding: 1rem 0 3rem;
}}
.au-article {{
  width: min(100%, 1100px);
  background: var(--au-surface); border:1px solid var(--au-border);
  border-radius: var(--au-r-lg);
  box-shadow: var(--au-shadow);
  padding: clamp(1rem, 2vw, 2rem);
}}

.au-prose {{ font-size: var(--au-prose); line-height: 1.75; word-wrap: break-word; }}
.au-prose p {{ margin: 1rem 0; }}
.au-prose h2 {{ font-size: clamp(1.25rem,2.2vw,1.6rem); margin:1.6rem 0 .6rem; }}
.au-prose h3 {{ font-size: clamp(1.05rem,1.8vw,1.3rem); margin:1.1rem 0 .5rem; }}
.au-prose ul, .au-prose ol {{ padding-left: 1.2rem; }}
.au-prose img {{ max-width:100%; height:auto; border-radius: 12px; }}
.au-prose a {{ color: var(--au-brand); text-decoration: underline; text-underline-offset: 2px; }}
.au-prose blockquote.pull-quote {{
  border-left: 4px solid var(--au-brand);
  padding-left: .9rem; margin: 1.2rem 0; color: var(--au-muted); font-size: 1.05rem;
}}
.au-prose .cta {{
  margin: 2rem 0 0; padding: 1rem 1.2rem;
  background: linear-gradient(0deg, rgba(14,165,233,.06), rgba(14,165,233,.03));
  border: 1px solid var(--au-border); border-radius: 12px;
}}

.au-progress {{
  position: fixed; top: 0; left: 0; height: 3px; width: 0%;
  background: linear-gradient(90deg, var(--au-brand), var(--au-brand-2));
  z-index: 0; pointer-events: none; transition: width .12s linear;
}}
</style>
{{% endblock %}}

{{% block content %}}
<div class="au-page">
  <div class="au-progress" id="au-progress" aria-hidden="true"></div>

  <div class="au-wrap">
    <!-- Back to Articles directly below the base header -->
    <p class="au-back"><a href="/healtharticles">← Back to Articles</a></p>

    <!-- Breadcrumbs below the back link -->
    <Breadcrumbs class="au-crumbs" aria-label="Breadcrumb">
      <a href="/">Home</a>
      <span aria-hidden="true">/</span>
      <a href="/healtharticles">Articles</a>
      <span aria-hidden="true">/</span>
      <span aria-current="page">{raw_title}</span>
    </Breadcrumbs>


    <section class="au-header" aria-label="Article header">
      <h1 class="au-title">{raw_title}</h1>
      <p class="au-lead">{meta_desc_attr}</p>
      <div class="au-meta">
        <span>{published}</span><span aria-hidden="true">·</span><span>{author}</span><span aria-hidden="true">·</span><span>{read_minutes} min read</span>
        {f'<span class="au-badge">{category_label}</span>' if category_label else ''}
      </div>
      {f'<figure class="au-cover" role="group" aria-label="Cover image"><img src="{cover_image}" alt="{raw_title}"></figure>' if cover_image else ''}
    </section>
  </div>

  <!-- article card -->
  <section class="au-article-wrap" aria-label="Article content">
    <article class="au-article">
      <div class="au-prose">{body_html}</div>
    </article>
  </section>
</div>
{{% endblock %}}

{{% block extra_scripts %}}
<script>
(function() {{
  // Progress bar (scoped)
  const bar = document.getElementById('au-progress');
  const update = () => {{
    const h = document.documentElement, b = document.body;
    const scrollTop = h.scrollTop || b.scrollTop;
    const height = (h.scrollHeight - h.clientHeight);
    const pct = height > 0 ? (scrollTop / height) * 100 : 0;
    if (bar) bar.style.width = pct + '%';
  }};
  document.addEventListener('scroll', update, {{ passive: true }});
  window.addEventListener('resize', update);
  update();
}})();
</script>
{{% endblock %}}
"""
    out_path.write_text(tpl, encoding="utf-8")


def generate_topics(topics: list, author_hint: str, category: str):
    manifest = load_manifest()
    used_slugs = {item.get("slug") for item in manifest if item.get("slug")}
    topic_index = {item.get("source_topic"): i for i, item in enumerate(manifest) if item.get("source_topic")}
    changed = False

    for topic in topics:
        try:
            # reuse slug & published_at if same topic already exists (append-only, update-in-place)
            existing_i = topic_index.get(topic)
            existing_rec = manifest[existing_i] if existing_i is not None else None

            if existing_rec:
                slug = existing_rec.get("slug")
                published_iso = existing_rec.get("published_at") or datetime.now(timezone.utc).isoformat()
            else:
                base = slugify(topic)
                slug = ensure_unique_slug(base, used_slugs)
                published_iso = datetime.now(timezone.utc).isoformat()

            data = call_openai(article_prompt(topic, author_hint))
            title = (data.get("title") or "Untitled").strip()
            body = (data.get("body_html") or "").strip()

            # Normalize body + inject pull-quote/cta if missing
            if not body.lower().startswith("<article"):
                body = f"<article>{body}</article>"
            # Ensure single <article> wrapper
            body = re.sub(r"(<article[^>]*>)(\s*<article[^>]*>)", r"\\1", body, flags=re.IGNORECASE)
            body = re.sub(r"(</article>)(\s*</article>)", r"\\1", body, flags=re.IGNORECASE)

            if 'class="pull-quote"' not in body:
                q = ('<blockquote class="pull-quote"><p>'
                     '<em>Progress in healthcare AI is a set of careful steps—always with clinicians leading.</em>'
                     '</p></blockquote>')
                parts = re.split(r"(</p>)", body, flags=re.IGNORECASE)
                if len(parts) >= 6:
                    parts[5] = parts[5] + q
                    body = "".join(parts)
                else:
                    body += q

            if 'class="cta"' not in body:
                cta = ('<section class="cta"><strong>Doctors Online Medical Services:</strong> '
                       'practical, safe ways to trim admin time and give clinicians a little breathing room.</section>')
                body += cta

            read_min = estimate_read_minutes(body)

            post = {
                "title": title,
                "slug": slug,
                "excerpt": (data.get("excerpt") or "")[:200],
                "meta_description": (data.get("meta_description") or "")[:155],
                "body_html": body,
                "author": data.get("author") or "Editors",
                "published_at": pretty_date_from_iso(published_iso),
                "read_minutes": read_min,
            }

            # Write the Jinja template (extends base.html)
            write_article_template(slug, post, category)

            # Update manifest JSON (for /api/articles) — append-only, but update-in-place if topic already existed
            record = {
                "title": title,
                "slug": slug,
                "excerpt": post["excerpt"],
                "meta_description": post["meta_description"],
                "author": post["author"],
                "published_at": published_iso,
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "category": category,  # 'nanize' or 'about'
                "source_topic": topic,  # lets us update in place on future runs
            }

            if existing_rec:
                manifest[existing_i] = record
            else:
                manifest.append(record)

            topic_index[topic] = len(manifest) - 1 if not existing_rec else existing_i
            changed = True
            print(f"✓ {title} → templates/articles/{slug}.html (extends base.html)")
        except Exception as e:
            print(f"✗ FAILED: {topic} - {e}")

    if changed:
        save_manifest(manifest)


if __name__ == "__main__":
    print("Adding new articles..…")
    # TOTAL = 20 new topics across both lists above
    generate_topics(NANIZE_SAFER_HEALTHIER, author_hint="Editors", category="nanize")
    generate_topics(ABOUT_US_VISION, author_hint="Editors", category="team")
    print("Done. Templates → templates/articles/, manifest → static/blog/index.json")
