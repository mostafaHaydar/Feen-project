import { CloudflareBindings, ErrorCodes, reporterSelect } from './common';
import { Context, Hono, MiddlewareHandler } from 'hono';
import { compareSync, genSaltSync, hashSync } from 'bcrypt-ts';
import { initializePrismaClient } from './common';
import { logInSchema, reporterSchema } from './data-validation';
import { zValidator } from '@hono/zod-validator';
import { verify } from 'hono/jwt';
import { sign } from 'hono/jwt';
import { JWTPayload } from 'hono/utils/jwt/types';
import { Reporters } from '@prisma/client';

type ReporterInformation = {
	name: string;
	email: string;
	password: string;
};

async function generateSignedJWT(account: Reporters, c: Context<{ Bindings: CloudflareBindings }>): Promise<string> {
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

export function middlewareVerifyReporterJWT(required = true): MiddlewareHandler {
	return async (c: Context<{ Bindings: CloudflareBindings }>, next) => {
		const authorization = (c.req.raw.headers.get('Authorization') || '').replaceAll(/\s+/g, ' ');
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

export function getReporterAccountId(c: Context<{ Bindings: CloudflareBindings }>): number {
	return c.get('reporterAccountId' as never) as number;
}

export default function reporterAccount(api: Hono<{ Bindings: CloudflareBindings }>) {
	// create reporter
	api.post('/reporter/register', zValidator('json', reporterSchema), async (c: Context) => {
		const prisma = initializePrismaClient(c);
		const body = c.req.valid('json' as never) as ReporterInformation;

		const { name, email, password } = body;
		const normalizedEmail = email.toLowerCase();
		const allowedDomains = ['gmail.com', 'hotmail.com', 'yahoo.com', 'outlook.com', 'icloud.com'];
		const emailDomain = normalizedEmail.split('@')[1];

		if (!allowedDomains.includes(emailDomain)) {
			return c.json({ error: ErrorCodes.EMAIL_FORMAT_NOT_SUPPORTED }, 400);
		}

		try {
			// Check if email already exists
			const existingUserByEmail = await prisma.reporters.count({
				where: { email: normalizedEmail },
			});

			if (existingUserByEmail > 0) {
				return c.json({ error: ErrorCodes.EMAIL_ALREADY_USED }, 409);
			}

			// Hash the password asynchronously
			const salt = genSaltSync(10);
			const hashedPassword = hashSync(password, salt);

			// Create new user
			const newUser = await prisma.reporters.create({
				data: {
					name,
					email: normalizedEmail,
					password: hashedPassword,
				},
				select: reporterSelect,
			});
			return c.json(newUser, 201);
			// Return created user without sensitive information
		} catch (error: any) {
			if (error.code === 'P2002') {
				// Unique constraint error
				return c.json({ error: ErrorCodes.ALREADY_USED }, 409);
			}
			console.log(error);
			return c.json({ error: ErrorCodes.INTERNAL_SERVER_ERROR }, 500);
		}
	});

	// login
	api.post('/reporter/login', zValidator('json', logInSchema), async (c) => {
		const { email, password } = c.req.valid('json');
		const prisma = initializePrismaClient(c);

		try {
			// Check if the account exists by email or phone
			const account = await prisma.reporters.findFirst({
				where: {
					email,
				},
			});

			if (!account) {
				console.log('Account not found:', email);
				// Avoid revealing whether the email exists
				return c.json({ error: ErrorCodes.INVALID_CREDENTIALS }, 401);
			}

			// Verify the password asynchronously
			const isPasswordValid = compareSync(password, account.password);
			if (!isPasswordValid) {
				console.log('Invalid password for account:', account.id);
				return c.json({ error: ErrorCodes.INVALID_CREDENTIALS }, 401);
			}

			// Generate JWT token
			const token = await generateSignedJWT(account, c);

			// Respond with user details and token
			return c.json(
				{
					account: {
						id: account.id,
						name: account.name,
						email: account.email,
						createdAt: account.createdAt,
						updatedAt: account.updatedAt,
					},
					token,
				},
				200
			);
		} catch (error: any) {
			return c.json({ error: ErrorCodes.INTERNAL_SERVER_ERROR }, 500);
		}
	});

	// get reporter data
	api.get('/reporter/me', middlewareVerifyReporterJWT(), async (c) => {
		const prisma = initializePrismaClient(c);

		try {
			const reporterAccountId = getReporterAccountId(c);

			// Fetch reporter data
			const reporter = await prisma.reporters.findUnique({
				where: { id: reporterAccountId },
				include: {
					Losts: true,
					Founds: true,
				},
			});

			if (!reporter) {
				return c.json({ error: ErrorCodes.NOT_FOUND }, 404);
			}

			return c.json(reporter, 200);
		} catch (error: any) {
			console.error('Error fetching reporter data:', error);
			return c.json({ error: ErrorCodes.INTERNAL_SERVER_ERROR }, 500);
		}
	});
}
