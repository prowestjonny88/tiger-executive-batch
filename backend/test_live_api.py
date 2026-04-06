import httpx
import json
import time

def run_test():
    base_url = "http://127.0.0.1:8001"
    
    print("--- 1. Testing Intake Preview (Quality Check) ---")
    print("We are simulating uploading your 'BorNEO HackWknd 2026 Finalist' email screenshot.")
    payload = {
        "site_id": "site-mall-01",
        "charger_id": "rex-ac-01",
        "symptom_text": "I can't charge my car, the connector looks weird.",
        "photo_hint": "A high-quality photo of an EV charging station connector that has a piece of chewing gum stuck inside it. The user is trying to find out why it won't plug in."
    }
    
    try:
        resp = httpx.post(f"{base_url}/api/v1/intake/preview", json=payload, timeout=30.0)
        print(f"Status: {resp.status_code}")
        print(json.dumps(resp.json(), indent=2))
    except Exception as e:
        print(f"Error calling intake: {e}")

    print("\n--- 2. Testing Triage (Diagnosis) ---")
    try:
        resp = httpx.post(f"{base_url}/api/v1/triage", json=payload, timeout=30.0)
        print(f"Status: {resp.status_code}")
        print(json.dumps(resp.json(), indent=2))
    except Exception as e:
        print(f"Error calling triage: {e}")

if __name__ == "__main__":
    run_test()
