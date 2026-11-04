import logging
import ssl

import httpx

from app.core.config import settings


logger = logging.getLogger("uvicorn.error.agent")


def agent_http_client(timeout: float = 10.0) -> httpx.AsyncClient:
    context = ssl.create_default_context(cafile=settings.agent_tls_ca_cert or None)
    if settings.agent_pki_enabled:
        try:
            context.load_cert_chain(settings.agent_tls_cert_chain, settings.agent_tls_private_key)
        except (OSError, ssl.SSLError):
            logger.error("[IAM mTLS] Client certificate/key load failed: chain=%s key=%s",
                         settings.agent_tls_cert_chain, settings.agent_tls_private_key)
            raise
        logger.info("[IAM mTLS] Client certificate loaded: client_id=%s chain=%s ca=%s",
                    settings.agent_client_id, settings.agent_tls_cert_chain, settings.agent_tls_ca_cert)
    return httpx.AsyncClient(timeout=timeout, verify=context, event_hooks={
        "request": [_log_request], "response": [_log_response],
    })


async def _log_request(request: httpx.Request) -> None:
    logger.info("[IAM request] method=%s url=%s authentication=%s",
                request.method, request.url.copy_with(query=None),
                "mTLS" if settings.agent_pki_enabled else "client_secret")


async def _log_response(response: httpx.Response) -> None:
    logger.info("[IAM response] method=%s url=%s status=%s",
                response.request.method, response.request.url.copy_with(query=None), response.status_code)
