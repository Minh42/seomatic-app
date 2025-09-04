import { NextResponse } from 'next/server';

export function addSecurityHeaders(response: NextResponse): NextResponse {
  // Basic security headers
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');

  // HSTS for production
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains'
    );
  }

  return response;
}

export function createSecureResponse(
  body: unknown,
  init?: ResponseInit
): NextResponse {
  const response = NextResponse.json(body, init);
  return addSecurityHeaders(response);
}

export function createSecureRedirect(
  url: string | URL,
  init?: ResponseInit
): NextResponse {
  const response = NextResponse.redirect(url, init);
  return addSecurityHeaders(response);
}
