import asyncio

from httpx import ASGITransport, AsyncClient

from app.main import app


def test_liveness_reports_alive() -> None:
    async def get_liveness() -> object:
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            return await client.get("/health/live")

    response = asyncio.run(get_liveness())

    assert response.status_code == 200
    assert response.json() == {"status": "alive"}