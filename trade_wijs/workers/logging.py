"""Structured logging utilities for workers."""

from __future__ import annotations

import json
import logging
import sys
from datetime import datetime, timezone
from typing import Any, Optional


class StructuredFormatter(logging.Formatter):
    """Structured JSON logging formatter."""
    
    def format(self, record: logging.LogRecord) -> str:
        """Format a log record as JSON."""
        log_data = {
            "timestamp": datetime.now(tz=timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        
        # Add exception info if present
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)
        
        # Add custom fields if provided
        if hasattr(record, "extra_fields"):
            log_data.update(record.extra_fields)
        
        return json.dumps(log_data)


def create_worker_logger(worker_name: str) -> logging.Logger:
    """Create a structured logger for a worker.
    
    Args:
        worker_name: Name of the worker (e.g., "market-snapshots")
        
    Returns:
        Configured logger instance
    """
    logger = logging.getLogger(f"trade_wijs.workers.{worker_name}")
    logger.setLevel(logging.INFO)
    
    # Clear any existing handlers
    logger.handlers = []
    
    # Create console handler with structured format
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(StructuredFormatter())
    logger.addHandler(handler)
    
    return logger


def log_cycle_start(
    logger: logging.Logger,
    cycle_number: int,
    worker_name: str,
) -> None:
    """Log the start of a worker cycle."""
    record = logger.makeRecord(
        logger.name,
        logging.INFO,
        "(worker-cycle-start)",
        0,
        f"Starting cycle {cycle_number}",
        (),
        None,
    )
    record.extra_fields = {
        "worker": worker_name,
        "cycle": cycle_number,
        "event": "cycle_start",
    }
    logger.handle(record)


def log_cycle_complete(
    logger: logging.Logger,
    cycle_number: int,
    worker_name: str,
    duration_seconds: float,
    items_processed: int = 0,
) -> None:
    """Log successful cycle completion."""
    record = logger.makeRecord(
        logger.name,
        logging.INFO,
        "(worker-cycle-complete)",
        0,
        f"Cycle {cycle_number} completed in {duration_seconds:.2f}s",
        (),
        None,
    )
    record.extra_fields = {
        "worker": worker_name,
        "cycle": cycle_number,
        "event": "cycle_complete",
        "duration_seconds": duration_seconds,
        "items_processed": items_processed,
    }
    logger.handle(record)


def log_cycle_error(
    logger: logging.Logger,
    cycle_number: int,
    worker_name: str,
    error: Exception,
    duration_seconds: float = 0,
) -> None:
    """Log a failed cycle."""
    record = logger.makeRecord(
        logger.name,
        logging.ERROR,
        "(worker-cycle-error)",
        0,
        f"Cycle {cycle_number} failed: {error}",
        (),
        None,
    )
    record.extra_fields = {
        "worker": worker_name,
        "cycle": cycle_number,
        "event": "cycle_error",
        "error_type": type(error).__name__,
            "error_message": str(error),
        "duration_seconds": duration_seconds,
    }
    logger.handle(record)


def log_worker_startup(
    logger: logging.Logger,
    worker_name: str,
    poll_seconds: int,
) -> None:
    """Log worker startup."""
    record = logger.makeRecord(
        logger.name,
        logging.INFO,
        "(worker-startup)",
        0,
        f"Worker '{worker_name}' starting with {poll_seconds}s poll interval",
        (),
        None,
    )
    record.extra_fields = {
        "worker": worker_name,
        "event": "startup",
        "poll_seconds": poll_seconds,
    }
    logger.handle(record)


def log_worker_shutdown(
    logger: logging.Logger,
    worker_name: str,
    reason: Optional[str] = None,
) -> None:
    """Log worker shutdown."""
    record = logger.makeRecord(
        logger.name,
        logging.WARNING,
        "(worker-shutdown)",
        0,
        f"Worker '{worker_name}' shutting down"
        + (f": {reason}" if reason else ""),
        (),
        None,
    )
    record.extra_fields = {
        "worker": worker_name,
        "event": "shutdown",
        "reason": reason,
    }
    logger.handle(record)
