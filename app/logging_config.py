# app/logging_config.py
from loguru import logger
import sys
from pathlib import Path
import logging

# Import settings FIRST
from .config import get_settings

# Ensure logs folder exists
Path("logs").mkdir(exist_ok=True)

# Get settings
settings = get_settings()
IS_DEVELOPMENT = settings.ENVIRONMENT == "development"

# Remove default handlers
logger.remove()

# Define emojis per level + SQLAlchemy special
LEVEL_EMOJIS = {
    "TRACE": "🔍",
    "DEBUG": "🐛",
    "INFO": "ℹ️ ",
    "SUCCESS": "✅",
    "WARNING": "⚠️",
    "ERROR": "❌",
    "CRITICAL": "🔥",
    "SQLALCHEMY": "🧩",
}


def formatter(record):
    """Custom console log format (safe for missing extras)."""
    level_name = record["level"].name
    emoji = LEVEL_EMOJIS.get(level_name, "💬")
    user = record["extra"].get("user", "system")
    method = record["extra"].get("method", "")
    path = record["extra"].get("path", "")

    # Detect SQLAlchemy log by its logger name
    if record["name"].startswith("sqlalchemy"):
        emoji = LEVEL_EMOJIS["SQLALCHEMY"]
        return (
            f"<green>{record['time']:YYYY-MM-DD HH:mm:ss}</green> "
            f"| <cyan>{emoji} SQL</cyan> "
            f"| <cyan>{record['name']}</cyan>:<cyan>{record['function']}</cyan>:<cyan>{record['line']}</cyan> "
            f"| 👤 <magenta>{user}</magenta> "
            f"- <cyan>{record['message']}</cyan>\n"
        )

    # Default application log style
    return (
        f"<green>{record['time']:YYYY-MM-DD HH:mm:ss}</green> "
        f"| <level>{emoji} {level_name:<8}</level> "
        f"| <cyan>{record['name']}</cyan>:<cyan>{record['function']}</cyan>:<cyan>{record['line']}</cyan> "
        f"| <blue>{method} {path}</blue> "
        f"| 👤 <magenta>{user}</magenta> "
        f"- <level>{record['message']}</level>\n"
    )


# Set log level depending on environment
LOG_LEVEL = "DEBUG" if IS_DEVELOPMENT else "INFO"

# Console logger (color, emoji, safe)
logger.add(
    sys.stderr,
    format=formatter,
    colorize=True,
    level=LOG_LEVEL,
    enqueue=not IS_DEVELOPMENT,  # Disable queue in dev to avoid semaphore warning
    backtrace=True,
    diagnose=False,
)


# File logger (safe defaults for missing keys)
def file_formatter(record):
    user = record["extra"].get("user", "system")
    method = record["extra"].get("method", "")
    path = record["extra"].get("path", "")
    emoji = LEVEL_EMOJIS.get(record["level"].name, "💬")

    if record["name"].startswith("sqlalchemy"):
        emoji = LEVEL_EMOJIS["SQLALCHEMY"]

    return (
        f"{record['time']:YYYY-MM-DD HH:mm:ss} | {emoji} {record['level'].name:<8} | "
        f"{record['name']}:{record['function']}:{record['line']} | "
        f"{method} {path} | {user} - {record['message']}\n"
    )


logger.add(
    "logs/{time:YYYY-MM-DD}.log",
    rotation="1 week",
    compression="zip",
    level="DEBUG",
    format=file_formatter,
    enqueue=not IS_DEVELOPMENT,  # Disable queue in dev to avoid semaphore warning
)


# ====================
# Intercept standard logging to Loguru
# ====================
class InterceptHandler(logging.Handler):
    def emit(self, record: logging.LogRecord):
        try:
            level = logger.level(record.levelname).name
        except ValueError:
            level = record.levelno

        frame, depth = sys._getframe(6), 6
        while frame and frame.f_code.co_filename == logging.__file__:
            frame = frame.f_back
            depth += 1

        logger.opt(depth=depth, exception=record.exc_info).log(
            level, record.getMessage()
        )


# Remove all handlers from root logger and add our interceptor
logging.root.handlers = [InterceptHandler()]
logging.root.setLevel(0)

# Configure specific loggers
for name in ["uvicorn", "uvicorn.access", "uvicorn.error"]:
    logging.getLogger(name).handlers = []
    logging.getLogger(name).propagate = True

# SQLAlchemy - suppress by default (keep INFO to see queries with 🧩 emoji)
logging.getLogger("sqlalchemy.engine").setLevel(logging.INFO)
logging.getLogger("sqlalchemy.pool").setLevel(logging.WARNING)

# Force SQLAlchemy to route logs through Loguru (avoid duplicates)
for name in list(logging.root.manager.loggerDict):
    if name.startswith("sqlalchemy"):
        sa_logger = logging.getLogger(name)
        sa_logger.handlers.clear()
        sa_logger.addHandler(InterceptHandler())
        sa_logger.propagate = False  # Prevent duplication

# Suppress Uvicorn access noise (your middleware already logs requests)
logging.getLogger("uvicorn.access").setLevel(logging.WARNING)

# Suppress noisy DEBUG logs from python_multipart (form parsing)
logging.getLogger("python_multipart").setLevel(logging.INFO)

# Suppress other common noisy libraries
logging.getLogger("httpx").setLevel(logging.INFO)
logging.getLogger("httpcore").setLevel(logging.INFO)


# File logger (safe defaults for missing keys)
def file_formatter(record):
    user = record["extra"].get("user", "system")
    method = record["extra"].get("method", "")
    path = record["extra"].get("path", "")
    emoji = LEVEL_EMOJIS.get(record["level"].name, "💬")

    if record["name"].startswith("sqlalchemy"):
        emoji = LEVEL_EMOJIS["SQLALCHEMY"]

    return (
        f"{record['time']:YYYY-MM-DD HH:mm:ss} | {emoji} {record['level'].name:<8} | "
        f"{record['name']}:{record['function']}:{record['line']} | "
        f"{method} {path} | {user} - {record['message']}\n"
    )


logger.add(
    "logs/{time:YYYY-MM-DD}.log",
    rotation="1 week",
    compression="zip",
    level="DEBUG",
    format=file_formatter,
    enqueue=not IS_DEVELOPMENT,  # Disable queue in dev to avoid semaphore warning
)


# ====================
# Intercept standard logging to Loguru
# ====================
class InterceptHandler(logging.Handler):
    def emit(self, record: logging.LogRecord):
        try:
            level = logger.level(record.levelname).name
        except ValueError:
            level = record.levelno

        frame, depth = sys._getframe(6), 6
        while frame and frame.f_code.co_filename == logging.__file__:
            frame = frame.f_back
            depth += 1

        logger.opt(depth=depth, exception=record.exc_info).log(
            level, record.getMessage()
        )


# Remove all handlers from root logger and add our interceptor
logging.root.handlers = [InterceptHandler()]
logging.root.setLevel(0)

# Configure specific loggers
for name in ["uvicorn", "uvicorn.access", "uvicorn.error"]:
    logging.getLogger(name).handlers = []
    logging.getLogger(name).propagate = True

# SQLAlchemy - suppress by default (keep INFO to see queries with 🧩 emoji)
logging.getLogger("sqlalchemy.engine").setLevel(logging.INFO)
logging.getLogger("sqlalchemy.pool").setLevel(logging.WARNING)

# Force SQLAlchemy to route logs through Loguru (avoid duplicates)
for name in list(logging.root.manager.loggerDict):
    if name.startswith("sqlalchemy"):
        sa_logger = logging.getLogger(name)
        sa_logger.handlers.clear()
        sa_logger.addHandler(InterceptHandler())
        sa_logger.propagate = False  # Prevent duplication

# Suppress Uvicorn access noise (your middleware already logs requests)
logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
