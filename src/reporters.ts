import { CloudflareBindings, ErrorCodes, reporterSelect } from './common';
import { Context, Hono } from 'hono';
import { compareSync, genSaltSync, hashSync } from 'bcrypt-ts';
import { initializePrismaClient } from './common';
import { logInSchema, reporterSchema } from './data-validation';
import { zValidator } from '@hono/zod-validator';
import {
  generateSignedJWT,
  getReporterAccountId,
  middlewareVerifyReporterJWT,
} from './auth';

export default function reporterAccount(
  api: Hono<{ Bindings: CloudflareBindings }>
) {
  api.post(
    '/reporter/register',
    zValidator('json', reporterSchema), // Validate request body against schema
    async (c: Context) => {
      const prisma = initializePrismaClient(c);
      const {
        name,
        email,
        password,
      }: {
        name: string;
        email: string;
        password: string;
      } = c.req.valid('json' as never);

      // Normalize email to prevent duplicate accounts with different cases
      const normalizedEmail = email.toLowerCase().trim();

      // Email domain whitelist to prevent spam accounts and ensure legitimate users
      // This helps maintain system integrity and reduces fake account creation
      const allowedDomains = [
        'gmail.com',
        'hotmail.com',
        'yahoo.com',
        'outlook.com',
        'icloud.com',
      ];

      // Extract domain from email for validation
      const emailDomain = normalizedEmail.split('@')[1];

      // Validate email domain against whitelist
      if (!emailDomain || !allowedDomains.includes(emailDomain)) {
        return c.json(
          {
            error: ErrorCodes.EMAIL_FORMAT_NOT_SUPPORTED,
            message:
              'Only popular email providers are supported for security reasons',
          },
          400
        );
      }

      try {
        // Check for existing user to prevent duplicate accounts
        const existingUserByEmail = await prisma.reporters.count({
          where: { email: normalizedEmail },
        });

        if (existingUserByEmail > 0) {
          return c.json(
            {
              error: ErrorCodes.EMAIL_ALREADY_USED,
              message: 'An account with this email already exists',
            },
            409
          );
        }

        // Securely hash password using bcrypt with salt rounds of 10
        // This provides a good balance between security and performance
        const salt = genSaltSync(10);
        const hashedPassword = hashSync(password, salt);

        // Create new reporter account and return safe user data
        // Using select to ensure sensitive data (password hash) is never returned
        const newUser = await prisma.reporters.create({
          data: {
            name: name.trim(), // Trim whitespace for consistency
            email: normalizedEmail,
            password: hashedPassword,
          },
          select: reporterSelect, // Select only safe fields to return
        });

        return c.json(
          {
            message: 'Account created successfully',
            user: newUser,
          },
          201
        );
      } catch (error: any) {
        // Handle Prisma unique constraint violations
        if (error.code === 'P2002') {
          return c.json(
            {
              error: ErrorCodes.ALREADY_USED,
              message: 'An account with this email already exists',
            },
            409
          );
        }

        // Log error for debugging but don't expose internal details
        console.error('Registration error:', error);
        return c.json(
          {
            error: ErrorCodes.INTERNAL_SERVER_ERROR,
            message: 'Failed to create account. Please try again.',
          },
          500
        );
      }
    }
  );

  api.post('/reporter/login', zValidator('json', logInSchema), async (c) => {
    const prisma = initializePrismaClient(c);

    const {
      email,
      password,
    }: {
      email: string;
      password: string;
    } = c.req.valid('json');

    try {
      // Normalize email input for consistent comparison
      const normalizedEmail = email.toLowerCase().trim();

      // Find reporter by email
      const account = await prisma.reporters.findFirst({
        where: { email: normalizedEmail },
      });

      // Use generic error message to prevent email enumeration attacks
      // This prevents attackers from determining which emails exist in the system
      if (!account) {
        console.log('Login attempt with non-existent email:', normalizedEmail);
        return c.json(
          {
            error: ErrorCodes.INVALID_CREDENTIALS,
            message: 'Invalid email or password',
          },
          401
        );
      }

      // Validate password using bcrypt compare function
      // This securely compares the provided password with the stored hash
      const isPasswordValid = compareSync(password, account.password);
      if (!isPasswordValid) {
        console.log('Invalid password attempt for account:', account.id);
        return c.json(
          {
            error: ErrorCodes.INVALID_CREDENTIALS,
            message: 'Invalid email or password',
          },
          401
        );
      }

      // Generate JWT token for authenticated session
      // The token contains the user ID and is signed with a secret key
      const token = await generateSignedJWT(account, c);

      // Return user info (safe fields only) and token
      // Never return the password hash or other sensitive data
      return c.json(
        {
          message: 'Login successful',
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
      console.error('Login error:', error);
      return c.json(
        {
          error: ErrorCodes.INTERNAL_SERVER_ERROR,
          message: 'Authentication failed. Please try again.',
        },
        500
      );
    }
  });

  api.get('/reporter/me', middlewareVerifyReporterJWT(), async (c) => {
    const prisma = initializePrismaClient(c);

    try {
      // Extract reporter ID from the verified JWT token context
      // This ensures the user can only access their own profile data
      const reporterAccountId = getReporterAccountId(c);

      // Fetch reporter along with all related reports
      // Using include to get associated lost and found person reports
      const reporter = await prisma.reporters.findUnique({
        where: { id: reporterAccountId },
        include: {
          Losts: {
            orderBy: { createdAt: 'desc' }, // Most recent reports first
            select: {
              id: true,
              name: true,
              age: true,
              gender: true,
              location: true,
              lastSeenLocation: true,
              lastSeenDate: true,
              found: true,
              createdAt: true,
              updatedAt: true,
              // Exclude sensitive fields like contactInfo, disease, mentalHealth
            },
          },
          Founds: {
            orderBy: { createdAt: 'desc' }, // Most recent reports first
            select: {
              id: true,
              name: true,
              age: true,
              gender: true,
              foundLocation: true,
              foundDate: true,
              description: true,
              createdAt: true,
              updatedAt: true,
              // Exclude sensitive fields like contactInfo
            },
          },
        },
      });

      if (!reporter) {
        // This should rarely happen since JWT validation ensures the user exists
        console.error('Reporter not found for valid JWT:', reporterAccountId);
        return c.json(
          {
            error: ErrorCodes.NOT_FOUND,
            message: 'User account not found',
          },
          404
        );
      }

      // Return the reporter's profile with related data
      // This provides a complete view of the user's activity
      return c.json(reporter, 200);
    } catch (error: any) {
      console.error('Error fetching reporter data:', error);
      return c.json(
        {
          error: ErrorCodes.INTERNAL_SERVER_ERROR,
          message: 'Failed to retrieve profile data',
        },
        500
      );
    }
  });
}
