import asyncio, httpx

async def test():
    base = "http://localhost:8000"
    async with httpx.AsyncClient(timeout=120) as c:
        pid = "291db433-51ff-4b72-a1f2-ce5c7475772d"
        r = await c.get(f"{base}/msme/{pid}")
        print(f"GET msme: {r.status_code}")
        if r.status_code != 200:
            print(f"  error: {r.text[:100]}")
            return

        r = await c.post(f"{base}/integrations/ocen/loan-request?msme_id={pid}")
        d = r.json()
        print(f"OCEN: {r.status_code} score={d['financial_health']['overall_score']} band={d['financial_health']['band']}")

        r = await c.post(f"{base}/integrations/aa-consent/request?msme_id={pid}")
        cid = r.json()["consent_id"]
        r = await c.post(f"{base}/integrations/aa-consent/{cid}/approve")
        r = await c.post(f"{base}/integrations/aa-consent/{cid}/pull")
        print(f"AA: {r.json()['status']}")

        r = await c.post(f"{base}/integrations/ingest/transaction?msme_id={pid}&amount=100000&type=credit")
        if r.status_code == 200:
            print(f"Ingest: new_score={r.json()['new_score']['overall_score']:.1f}")
        else:
            print(f"Ingest error: {r.status_code} {r.text[:200]}")

asyncio.run(test())
