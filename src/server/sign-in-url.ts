import { headers } from 'next/headers';
import { buildUriWithNext } from '../uri';
import { MissingEnvError } from './missing-env-error';

export async function getSignInUrl(authUrl: string | undefined, path = '/'): Promise<string> {
  if (!authUrl) throw new MissingEnvError('NEXT_PUBLIC_AUTH_URL');
  const requestHeaders = await headers();
  const host = requestHeaders.get('x-forwarded-host') ?? requestHeaders.get('host');
  const proto = requestHeaders.get('x-forwarded-proto') ?? 'http';
  const signIn = new URL('/sign-in', authUrl).toString();
  if (!host) return signIn;
  return buildUriWithNext(signIn, new URL(path, `${proto}://${host}`).toString());
}
