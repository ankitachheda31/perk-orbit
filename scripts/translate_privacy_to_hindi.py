"""One-off helper: translate /app/frontend/public/privacy.html prose to Hindi
using GPT-4o via emergentintegrations, preserving HTML structure.

Run:  python3 /app/scripts/translate_privacy_to_hindi.py
Output: /app/frontend/public/privacy-hi.html  (overwritten)
"""
from __future__ import annotations

import asyncio
import os
import re
import secrets
import sys
from pathlib import Path

# Ensure backend deps importable
sys.path.insert(0, "/app/backend")

SRC = Path("/app/frontend/public/privacy.html")
DST = Path("/app/frontend/public/privacy-hi.html")

DRAFT_BANNER = """
<div style="background:#FEF3C7;border-left:4px solid #D97706;padding:14px 18px;margin-bottom:24px;border-radius:6px;font-size:14px;color:#78350F">
  <strong>मसौदा / Draft — pending native review.</strong><br/>
  यह हिंदी अनुवाद GPT-4o द्वारा स्वतः उत्पन्न किया गया है और किसी मूल वक्ता द्वारा अंतिम समीक्षा से पहले प्रकाशित किया गया है।
  यदि व्याख्या में कोई विरोधाभास उत्पन्न होता है, तो
  <a href="./privacy.html" style="color:#065F46;text-decoration:underline">अंग्रेज़ी संस्करण</a>
  को अंतिम माना जाएगा।
</div>
""".strip()


SYSTEM_PROMPT = """You are a professional legal translator working from English to formal Hindi (हिन्दी) for an Indian fintech privacy policy.

STRICT RULES:
1. Translate ONLY the visible English prose into formal, respectful Hindi (Devanagari script).
2. Preserve EVERY HTML tag, attribute, class, id, style, and inline structure EXACTLY as-is. Do NOT reformat indentation.
3. Keep these tokens UNCHANGED in English (do not translate or transliterate):
   - Brand names: PerkWorth
   - Legal identifiers: DPDP, GDPR, PCI-DSS, AES-256, TLS, HTTPS, bcrypt, HMAC-SHA256
   - Email addresses, URLs, phone numbers, CSS class names, all numeric values (₹99, 30 days, 7 years, etc.)
   - Section numbers in headings (e.g. "5a.", "10.")
   - Code/file/cookie names: access_token, refresh_token, perk_biometric_v1, etc.
   - Sub-processor names: OpenAI, Razorpay, MongoDB Atlas, Resend, Vercel, Emergent
   - Statutory citations: §11, §13(3), §14, Art. 15, etc.
4. Translate label words around them — e.g. "Last updated:" → "अंतिम अद्यतन:", "Operator:" → "संचालक:".
5. For terms like "Pro membership", "Family Circle", "Savings Assistant", "Voucher" — keep the English noun but add a brief Hindi gloss in parentheses on FIRST occurrence only.  Example: "Pro membership (प्रो सदस्यता)".
6. The Grievance Officer's name "Ankita Chheda" stays in English/Roman script.
7. The placeholder "(Legal Entity Name Pending)" stays EXACTLY as-is in English.
8. Keep the page title and meta description in Hindi but inside the same <title> / <meta> tags.
9. The <html lang="..."> attribute MUST be changed to "hi".
10. Return ONLY the full transformed HTML document — no commentary, no markdown code fences."""


async def translate(html_in: str) -> str:
    from emergentintegrations.llm.chat import LlmChat, UserMessage

    api_key = os.environ.get("EMERGENT_LLM_KEY")
    if not api_key:
        raise SystemExit("EMERGENT_LLM_KEY not set in environment")

    chat = LlmChat(
        api_key=api_key,
        session_id=f"privacy-hi-{secrets.token_hex(4)}",
        system_message=SYSTEM_PROMPT,
    ).with_model("openai", "gpt-4o")

    response = await chat.send_message(UserMessage(
        text=f"Translate this privacy-policy HTML document to formal Hindi following the rules.\n\n----- BEGIN HTML -----\n{html_in}\n----- END HTML -----"
    ))
    out = response if isinstance(response, str) else str(response)
    # Strip stray fences if model added them
    out = re.sub(r"^```(?:html)?\s*", "", out.strip(), flags=re.IGNORECASE)
    out = re.sub(r"\s*```$", "", out.strip())
    return out


def inject_draft_banner(html: str) -> str:
    # Insert banner immediately after <main ...> opening tag
    return re.sub(
        r'(<main[^>]*>)',
        lambda m: m.group(1) + "\n" + DRAFT_BANNER + "\n",
        html,
        count=1,
    )


async def main():
    src_html = SRC.read_text(encoding="utf-8")
    print(f"[translate] read {len(src_html)} chars from {SRC}")
    translated = await translate(src_html)
    print(f"[translate] received {len(translated)} chars from GPT-4o")

    # Safety: ensure lang attribute switched to hi
    translated = re.sub(r'<html\s+lang="[^"]*"', '<html lang="hi"', translated, count=1)

    # Inject draft banner (idempotent)
    if "मसौदा / Draft" not in translated:
        translated = inject_draft_banner(translated)

    DST.write_text(translated, encoding="utf-8")
    print(f"[translate] wrote {len(translated)} chars to {DST}")


if __name__ == "__main__":
    asyncio.run(main())
