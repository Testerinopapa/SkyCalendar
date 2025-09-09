import { test, expect } from '@playwright/test';

test.describe('API connectivity', () => {
  test('Open-Meteo astronomy returns daily keys', async ({ request }) => {
    const res = await request.get('/api/astronomy?lat=37.7749&lon=-122.4194');
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    expect(json).toHaveProperty('daily');
    expect(json.daily).toHaveProperty('sunrise');
    expect(Array.isArray(json.daily.sunrise)).toBeTruthy();
  });

  test('Space weather returns array', async ({ request }) => {
    const res = await request.get('/api/space-weather');
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    expect(Array.isArray(json)).toBeTruthy();
  });
});


