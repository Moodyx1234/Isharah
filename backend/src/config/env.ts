import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().default(3001),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL must be provided'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  ANTHROPIC_API_KEY: z.string().optional().default(''),
  OPENAI_API_KEY:    z.string().optional().default(''),
  AWS_BUCKET_NAME: z.string().optional(),
  AWS_REGION: z.string().optional(),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  console.error('Environment variable validation failed:');
  const fieldErrors = result.error.flatten().fieldErrors;
  for (const [field, errors] of Object.entries(fieldErrors)) {
    console.error(`  ${field}: ${errors?.join(', ')}`);
  }
  process.exit(1);
}

export const env = result.data;
