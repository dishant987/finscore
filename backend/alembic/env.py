from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool
from alembic import context
from sqlmodel import SQLModel
from app.core.config import settings
from app.models import *  # noqa: F401, F403

config = context.config

alembic_url = settings.database_url_alembic or settings.database_url
alembic_url = alembic_url.replace("+asyncpg", "+psycopg2").replace("+aiosqlite", "")
if "postgresql" in alembic_url and "+" not in alembic_url:
    parts = alembic_url.split("://", 1)
    alembic_url = f"{parts[0]}+psycopg2://{parts[1]}"
config.set_main_option("sqlalchemy.url", alembic_url)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = SQLModel.metadata


def run_migrations_offline():
    url = config.get_main_option("sqlalchemy.url")
    context.configure(url=url, target_metadata=target_metadata, literal_binds=True, dialect_opts={"paramstyle": "named"})
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online():
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
