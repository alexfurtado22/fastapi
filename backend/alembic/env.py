import asyncio
import os
import sys
from logging.config import fileConfig

# Third-party imports
from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config

from alembic import context

# --- FIX PYTHON PATH ---
current_path = os.path.dirname(os.path.abspath(__file__))
sys.path.append(os.path.join(current_path, ".."))
# -----------------------

# Local application imports
from app.config import get_settings  # noqa: E402
from app.database import Base  # noqa: E402, F401
from app.models import Comment, Post, User  # noqa: E402, F401

# Alembic Config object
config = context.config

# Interpret the config file for Python logging
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata

# Load settings
settings = get_settings()

# --- 👇 DEBUG PRINT ---
print("----- ALEMBIC DEBUG -----")
print(f"SETTINGS DATABASE_URL: {settings.DATABASE_URL}")
# -----------------------


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = settings.DATABASE_URL
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata)

    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    """Run migrations in 'online' mode with async support."""

    # 1. Get the config section
    configuration = config.get_section(config.config_ini_section) or {}

    # 2. OVERRIDE the URL explicitly
    configuration["sqlalchemy.url"] = settings.DATABASE_URL

    print(f"CONNECTING TO: {configuration['sqlalchemy.url']}")

    connectable = async_engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    # --- 👇 STRONGER RETRY LOOP ---
    # Increased to 15 retries (approx 30 seconds)
    retries = 15
    for i in range(retries):
        try:
            async with connectable.connect() as connection:
                await connection.run_sync(do_run_migrations)
            print("✅ Migrations successful!")
            break  # If successful, exit the loop
        except Exception as e:
            if i == retries - 1:
                print(f"❌ Migration failed after {retries} attempts.")
                raise e  # Crash if all retries fail

            print(
                f"⚠️ Database connection failed, retrying in 2s... ({i + 1}/{retries})"
            )
            # Print error to help debug (usually "Name or service not known")
            print(f"   Error: {e}")
            await asyncio.sleep(2)
    # -------------------------------

    await connectable.dispose()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
