import os
from dotenv import load_dotenv

load_dotenv()

ALPACA_API_KEY = os.getenv("ALPACA_API_KEY")
ALPACA_SECRET_KEY = os.getenv("ALPACA_SECRET_KEY")
ALPACA_BASE_URL = os.getenv("ALPACA_BASE_URL", "https://paper-api.alpaca.markets")
ALPACA_STREAM_URL = os.getenv("ALPACA_STREAM_URL", "wss://stream.data.alpaca.markets/v2")

def validate():
    missing = [k for k, v in {
        "ALPACA_API_KEY": ALPACA_API_KEY,
        "ALPACA_SECRET_KEY": ALPACA_SECRET_KEY,
    }.items() if not v]
    if missing:
        raise EnvironmentError(f"Missing credentials in .env: {', '.join(missing)}")
