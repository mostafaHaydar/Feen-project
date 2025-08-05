import { z } from 'zod';

export const reporterSchema = z.object({
  name: z.string().min(2).max(30),
  email: z.string().max(100).email().toLowerCase(),
  password: z.string().min(8),
});

export const logInSchema = z.object({
  email: z.string().max(100).email().toLowerCase().optional(),
  password: z.string().min(8),
});

export const photoSchema = z.object({
  documentB64: z.string().min(1),
});

export const lostSchema = z.object({
  name: z.string().min(1),
  location: z.string().min(1),
  lastSeenLocation: z.string().min(1),
  lastSeenDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid date format',
  }),
  age: z.number().int().min(0).optional(),
  gender: z.string().min(1),
  contactInfo: z.string().optional(),
  disease: z.string().optional(),
  mentalHealth: z.string().optional(),
  found: z.boolean().optional().default(false),
});

export const foundSchema = z.object({
  name: z.string().optional(),
  foundLocation: z.string().min(1),
  foundDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid date format',
  }),
  description: z.string().optional(),
  age: z.number().int().min(0).optional(),
  gender: z.string().min(1),
  contactInfo: z.string().optional(),
});
