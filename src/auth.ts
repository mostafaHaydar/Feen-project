import { CloudflareBindings } from './common';
import { Context, MiddlewareHandler } from 'hono';
import { verify } from 'hono/jwt';
import { sign } from 'hono/jwt';
import { JWTPayload } from 'hono/utils/jwt/types';
import { Reporters } from '@prisma/client';

export async function generateSignedJWT(
  account: Reporters,
  c: Context<{ Bindings: CloudflareBindings }>
): Promise<string> {
  try {
    const { id: sub } = account; // Destructure to simplify payload creation
    const payload: JWTPayload = { sub };
    // Directly return the promise without `await` to avoid extra async overhead
    return sign(payload, c.env.JWT_SECRET_KEY);
  } catch (error) {
    console.error('Error generating JWT:', error);
    throw new Error('Failed to generate signed JWT');
  }
}

export function middlewareVerifyReporterJWT(
  required = true
): MiddlewareHandler {
  return async (c: Context<{ Bindings: CloudflareBindings }>, next) => {
    const authorization = (
      c.req.raw.headers.get('Authorization') || ''
    ).replaceAll(/\s+/g, ' ');
    const tokenParts = authorization.split(' '); // Bearer <token>
    if (tokenParts.length !== 2) {
      if (required) {
        return c.json({ error: 'Invalid JWT token' }, 401);
      }

      await next();
      return;
    }

    const token = tokenParts[1].trim();
    try {
      const payload = await verify(token, c.env.JWT_SECRET_KEY);

      c.set('jwtPayload', payload);
      // @ts-expect-error

      c.set('reporterAccountId', parseInt(payload.sub!, 10));
    } catch (e) {
      if (!required) {
        // Not required
        await next();
        return;
      }

      // Invalid JWT is not acceptable
      return c.json({ error: 'Invalid JWT token' }, 401);
    }

    await next();
  };
}

export function getReporterAccountId(
  c: Context<{ Bindings: CloudflareBindings }>
): number {
  return c.get('reporterAccountId' as never) as number;
}
