from urllib.parse import urlencode, urlparse, parse_qs, urlunparse

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlmodel import SQLModel

from app.core.config import settings

_ASYNCPG_KWARGS = {
    "ssl", "direct_tls", "command_timeout", "statement_cache_size",
    "max_cached_statement_lifetime", "max_cacheable_statement_size",
    "server_settings", "target_session_attrs",
}


def _async_url():
    url = settings.database_url_pooled or settings.database_url
    if "postgresql" in url and "+" not in url:
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
    elif url.startswith("postgresql+psycopg2"):
        url = url.replace("postgresql+psycopg2", "postgresql+asyncpg", 1)
    elif url.startswith("sqlite+aiosqlite"):
        pass
    elif url.startswith("sqlite"):
        url = url.replace("sqlite://", "sqlite+aiosqlite://", 1)
    return url


_connect_args: dict = {}
async_url = _async_url()

if "postgresql" in async_url:
    parsed = urlparse(async_url)
    query = parse_qs(parsed.query, keep_blank_values=True)

    for key in list(query):
        if key in _ASYNCPG_KWARGS:
            _connect_args[key] = query.pop(key)[0]
        else:
            query.pop(key)

    if "ssl" not in _connect_args:
        _connect_args["ssl"] = "require"

    parsed = parsed._replace(query=urlencode(query, doseq=True))
    async_url = urlunparse(parsed)

engine = create_async_engine(
    async_url,
    echo=settings.debug,
    pool_size=5,
    max_overflow=10,
    pool_pre_ping=True,
    connect_args=_connect_args,
)

async_session_factory = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)


async def get_session():
    async with async_session_factory() as session:
        yield session
