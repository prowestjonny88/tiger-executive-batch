import os
from pathlib import Path
from dotenv import load_dotenv

def check_vlm():
    print("--- OmniTriage VLM Diagnostics ---")
    
    # 1. Environment check
    env_path = Path(__file__).resolve().parents[0] / ".env"
    print(f"Checking for .env at: {env_path}")
    if env_path.exists():
        print("[OK] .env file found.")
        load_dotenv(env_path)
    else:
        print("[WARN] .env file NOT found. Backend is relying on system env vars.")

    # 2. Key check
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if api_key:
        masked_key = api_key[:4] + "*" * (len(api_key) - 8) + api_key[-4:]
        print(f"[OK] GEMINI_API_KEY is set: {masked_key}")
    else:
        print("[FAIL] GEMINI_API_KEY is NOT set. VLM will NOT work (heuristic fallback enabled).")

    # 3. Client Check
    try:
        from app.services.gemini_client import get_gemini_client
        client = get_gemini_client()
        if client:
            print("[OK] Gemini client initialized successfully.")
        else:
            print("[FAIL] Gemini client failed to initialize.")
    except ImportError as e:
        print(f"[FAIL] Dependency error: {e}")

    # 4. Live Test Recommendation
    print("\nTo see it working in the app:")
    print("1. Go to http://localhost:3000/upload")
    print("2. Upload a photo or select a scenario.")
    print("3. If it's working, the 'Likely Fault' result will be more descriptive and structured than the generic mock data.")

if __name__ == "__main__":
    check_vlm()
