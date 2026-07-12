"""HTML sanitizer using bleach."""
from __future__ import annotations

import bleach


ALLOWED_TAGS = [
    "p", "br", "strong", "b", "em", "i", "u", "ul", "ol", "li",
    "h1", "h2", "h3", "h4", "blockquote", "pre", "code", "img", "a", "span",
]
ALLOWED_ATTRS = {
    "*": ["class"],
    "a": ["href", "title", "target"],
    "img": ["src", "alt", "title", "width", "height"],
}
ALLOWED_PROTOCOLS = ["http", "https", "mailto"]


def clean(text: str | None) -> str:
    if not text:
        return ""
    return bleach.clean(
        text,
        tags=ALLOWED_TAGS,
        attributes=ALLOWED_ATTRS,
        protocols=ALLOWED_PROTOCOLS,
        strip=True,
    )
