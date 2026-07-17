import asyncio
import ipaddress
import socket
from html.parser import HTMLParser
from urllib.parse import urljoin, urlparse

import httpx


MAX_HTML_BYTES = 1_000_000
MAX_REDIRECTS = 5


class PageMetadataParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.in_title = False
        self.title_parts: list[str] = []
        self.metadata: dict[str, str] = {}

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attributes = {key.lower(): value for key, value in attrs}
        if tag.lower() == "title":
            self.in_title = True
            return

        if tag.lower() != "meta":
            return

        key = (attributes.get("property") or attributes.get("name") or "").lower()
        content = attributes.get("content")
        supported_keys = {
            "og:title",
            "twitter:title",
            "og:description",
            "twitter:description",
            "description",
        }
        if key in supported_keys and content and key not in self.metadata:
            self.metadata[key] = content

    def handle_endtag(self, tag: str) -> None:
        if tag.lower() == "title":
            self.in_title = False

    def handle_data(self, data: str) -> None:
        if self.in_title:
            self.title_parts.append(data)

    def get_metadata(self) -> dict[str, str | None]:
        title_value = (
            self.metadata.get("og:title")
            or self.metadata.get("twitter:title")
            or "".join(self.title_parts)
        )
        description_value = (
            self.metadata.get("og:description")
            or self.metadata.get("twitter:description")
            or self.metadata.get("description")
            or ""
        )
        title = " ".join(title_value.split())[:200]
        description = " ".join(description_value.split())[:500]
        return {
            "title": title or None,
            "description": description or None,
        }


def parse_page_metadata(html: str) -> dict[str, str | None]:
    parser = PageMetadataParser()
    parser.feed(html)
    return parser.get_metadata()


async def ensure_public_url(url: str) -> None:
    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"} or not parsed.hostname:
        raise ValueError("Only public HTTP and HTTPS URLs are supported.")

    try:
        addresses = await asyncio.to_thread(
            socket.getaddrinfo,
            parsed.hostname,
            parsed.port or (443 if parsed.scheme == "https" else 80),
            type=socket.SOCK_STREAM,
        )
    except socket.gaierror as error:
        raise ValueError("The website address could not be resolved.") from error

    if not addresses or any(not ipaddress.ip_address(item[4][0]).is_global for item in addresses):
        raise ValueError("Private or local website addresses are not supported.")


async def fetch_page_metadata(url: str) -> dict[str, str | None]:
    current_url = url
    timeout = httpx.Timeout(5.0, connect=3.0)
    headers = {
        "accept": "text/html,application/xhtml+xml",
        "user-agent": "Mozilla/5.0 (compatible; SeenSpace/1.0; +https://seenspace.local)",
    }

    async with httpx.AsyncClient(timeout=timeout, follow_redirects=False) as client:
        for _ in range(MAX_REDIRECTS + 1):
            await ensure_public_url(current_url)
            async with client.stream("GET", current_url, headers=headers) as response:
                if response.is_redirect:
                    location = response.headers.get("location")
                    if not location:
                        return {"title": None, "description": None}
                    current_url = urljoin(current_url, location)
                    continue

                response.raise_for_status()
                content_type = response.headers.get("content-type", "").lower()
                if content_type and "html" not in content_type:
                    return {"title": None, "description": None}

                chunks: list[bytes] = []
                size = 0
                async for chunk in response.aiter_bytes():
                    remaining = MAX_HTML_BYTES - size
                    if remaining <= 0:
                        break
                    chunks.append(chunk[:remaining])
                    size += min(len(chunk), remaining)

                encoding = response.charset_encoding or "utf-8"
                html = b"".join(chunks).decode(encoding, errors="replace")
                return parse_page_metadata(html)

    return {"title": None, "description": None}
