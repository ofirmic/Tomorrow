import { z } from 'zod';

const envSchema = z.object({
  PORT: z.string().default('4000').transform((v) => Number(v)),
  DATABASE_URL: z.string().min(1),
  TOMORROW_API_KEY: z.string().min(1, 'TOMORROW_API_KEY is required'),
  EVAL_CRON: z.string().default('*/5 * * * *'),
  UNITS: z.enum(['metric', 'imperial']).default('metric'),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function loadEnv(env: NodeJS.ProcessEnv = process.env): EnvConfig {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    console.error('Invalid environment configuration', parsed.error.flatten());
    throw new Error('Invalid environment configuration');
  }
  return parsed.data;
}


