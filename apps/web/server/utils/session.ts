import type { H3Event } from 'h3'

export const TOKEN_COOKIE = 'emas_token'

export function setSessionToken(event: H3Event, token: string) {
  setCookie(event, TOKEN_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: getRequestProtocol(event, { xForwardedProto: true }) === 'https',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  })
}

export const clearSessionToken = (event: H3Event) => deleteCookie(event, TOKEN_COOKIE, { path: '/' })
