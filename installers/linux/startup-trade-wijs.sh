#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="${1:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is not installed or not in PATH." >&2
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "Docker Compose plugin is missing." >&2
  exit 1
fi

get_python_bin() {
  if command -v python3 >/dev/null 2>&1; then
    command -v python3
    return 0
  fi

  if command -v python >/dev/null 2>&1; then
    command -v python
    return 0
  fi

  return 1
}

file_sha256() {
  local file_path="$1"

  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$file_path" | awk '{print $1}'
    return 0
  fi

  if command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$file_path" | awk '{print $1}'
    return 0
  fi

  return 1
}

sync_requirements() {
  local project_dir="$1"
  local requirements_path="$project_dir/requirements.txt"

  if [[ ! -f "$requirements_path" ]]; then
    echo "No requirements.txt found, skipping venv package sync."
    return 0
  fi

  local venv_dir="$project_dir/.venv"
  local venv_python="$venv_dir/bin/python"

  if [[ ! -d "$venv_dir" ]]; then
    local python_bin
    python_bin="$(get_python_bin)" || {
      echo "Python launcher not found (python3/python)." >&2
      return 1
    }

    echo "Creating virtual environment at $venv_dir"
    "$python_bin" -m venv "$venv_dir"
  fi

  if [[ ! -x "$venv_python" ]]; then
    echo "Venv Python executable not found: $venv_python" >&2
    return 1
  fi

  local requirements_hash
  requirements_hash="$(file_sha256 "$requirements_path")" || {
    echo "Could not calculate SHA-256 hash for requirements.txt." >&2
    return 1
  }

  local hash_file="$venv_dir/.requirements.sha256"
  local stored_hash=""
  if [[ -f "$hash_file" ]]; then
    stored_hash="$(head -n 1 "$hash_file")"
  fi

  if [[ "$requirements_hash" == "$stored_hash" ]]; then
    echo "requirements.txt unchanged; skipping package installation."
    return 0
  fi

  echo "Installing packages from requirements.txt into .venv"
  "$venv_python" -m pip install -r "$requirements_path"
  printf '%s\n' "$requirements_hash" > "$hash_file"
}

cd "$PROJECT_DIR"
sync_requirements "$PROJECT_DIR"

echo "Building and starting containers..."
docker compose up -d --build
