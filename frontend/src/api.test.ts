import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api, ApiError } from './api'

describe('API client', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  it('uses the existing incident route and bearer header', async () => {
    const fetchMock = vi.mocked(fetch)
    fetchMock.mockResolvedValue(new Response(JSON.stringify([]), { status: 200 }))

    await api.listIncidents({ limit: 10, offset: 0, status: 'Open' }, 'opaque-token')

    const [url, options] = fetchMock.mock.calls[0]
    const headers = new Headers(options?.headers)
    expect(url).toBe('/api/v1/incidents?offset=0&limit=10&status=Open')
    expect(headers.get('Accept')).toBe('application/json')
    expect(headers.get('Authorization')).toBe('Bearer opaque-token')
  })

  it('sends login credentials to the existing authentication endpoint', async () => {
    const fetchMock = vi.mocked(fetch)
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ access_token: 'opaque', token_type: 'bearer', expires_in: 300 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    await api.login('admin@example.com', 'test-password')

    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/v1/auth/login')
    expect(options?.method).toBe('POST')
    expect(options?.body).toBe(JSON.stringify({ email: 'admin@example.com', password: 'test-password' }))
  })

  it('translates backend validation and authorization details into ApiError', async () => {
    const fetchMock = vi.mocked(fetch)
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ detail: 'Your role cannot create incidents' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    await expect(
      api.createIncident(
        {
          title: 'Denied incident',
          description: 'A useful description',
          severity: 'Low',
          category: 'Test',
        },
        'viewer-token',
      ),
    ).rejects.toEqual(new ApiError('Your role cannot create incidents', 403))
  })
})