"""Worker health check utilities."""

from __future__ import annotations

import json
import time
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional


@dataclass
class WorkerHealthStatus:
    """Health status for a worker."""
    
    worker_name: str
    is_healthy: bool
    last_success_time: Optional[float]
    last_error_time: Optional[float]
    last_error_message: Optional[str]
    cycles_completed: int
    cycles_failed: int
    uptime_seconds: float
    
    def to_json(self) -> str:
        """Serialize to JSON string."""
        return json.dumps(asdict(self), default=str)
    
    @staticmethod
    def from_json(data: str) -> WorkerHealthStatus:
        """Deserialize from JSON string."""
        return WorkerHealthStatus(**json.loads(data))


class WorkerHealthChecker:
    """Tracks and manages worker health status."""
    
    def __init__(self, worker_name: str):
        """Initialize health checker for a worker.
        
        Args:
            worker_name: Name of the worker (e.g., "market-snapshots")
        """
        self.worker_name = worker_name
        self.start_time = time.time()
        self.last_success_time: Optional[float] = None
        self.last_error_time: Optional[float] = None
        self.last_error_message: Optional[str] = None
        self.cycles_completed = 0
        self.cycles_failed = 0
        self.status_file = Path(f"/tmp/worker-health-{worker_name}.json")
    
    def record_success(self) -> None:
        """Record a successful cycle execution."""
        self.last_success_time = time.time()
        self.cycles_completed += 1
        self._write_status()
    
    def record_failure(self, error: Optional[Exception] = None) -> None:
        """Record a failed cycle execution.
        
        Args:
            error: Exception that occurred, if any
        """
        self.last_error_time = time.time()
        self.last_error_message = str(error) if error else "Unknown error"
        self.cycles_failed += 1
        self._write_status()
    
    def get_status(self) -> WorkerHealthStatus:
        """Get current health status."""
        uptime = time.time() - self.start_time
        
        # Worker is healthy if:
        # - At least one successful cycle
        # - Last cycle was successful (or within last 2x poll interval)
        is_healthy = (
            self.cycles_completed > 0 
            and (
                self.last_success_time is None 
                or (time.time() - self.last_success_time) < 300  # 5 minutes grace period
            )
        )
        
        return WorkerHealthStatus(
            worker_name=self.worker_name,
            is_healthy=is_healthy,
            last_success_time=self.last_success_time,
            last_error_time=self.last_error_time,
            last_error_message=self.last_error_message,
            cycles_completed=self.cycles_completed,
            cycles_failed=self.cycles_failed,
            uptime_seconds=uptime,
        )
    
    def _write_status(self) -> None:
        """Write current status to file for external monitoring."""
        try:
            status = self.get_status()
            self.status_file.write_text(status.to_json())
        except Exception:
            # Don't fail the worker if status writing fails
            pass
    
    @staticmethod
    def read_status_file(worker_name: str) -> Optional[WorkerHealthStatus]:
        """Read health status from file (for monitoring)."""
        status_file = Path(f"/tmp/worker-health-{worker_name}.json")
        try:
            if status_file.exists():
                return WorkerHealthStatus.from_json(status_file.read_text())
        except Exception:
            pass
        return None


class HealthCheckEndpoint:
    """Simple in-memory health status for HTTP checks."""
    
    _statuses: dict[str, WorkerHealthStatus] = {}
    
    @classmethod
    def register_checker(cls, worker_name: str, checker: WorkerHealthChecker) -> None:
        """Register a worker health checker."""
        # Note: In production, this would be replaced by reading from /tmp files
        # or a shared health check service
        pass
    
    @classmethod
    def get_all_statuses(cls) -> dict[str, dict]:
        """Get all worker statuses for diagnostics."""
        statuses = {}
        for worker_name in ["market-snapshots", "exchange-settings", "chart-warmer"]:
            status = WorkerHealthChecker.read_status_file(worker_name)
            if status:
                statuses[worker_name] = asdict(status)
        return statuses
