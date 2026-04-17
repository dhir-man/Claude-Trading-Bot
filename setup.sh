#!/usr/bin/env bash
# Run once to create the virtual environment and install dependencies.

python -m venv .venv
source .venv/Scripts/activate   # Windows (Git Bash / WSL)
# source .venv/bin/activate     # Mac / Linux

pip install --upgrade pip
pip install -r requirements.txt

if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created .env from template — fill in your Alpaca credentials."
fi

echo "Setup complete. Activate the venv with: source .venv/Scripts/activate"
