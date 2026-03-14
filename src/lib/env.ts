const requiredVars = ['DATABASE_URL'] as const;

type EnvVars = Record<(typeof requiredVars)[number], string>;

export function validateEnv(): EnvVars {
  const missing: string[] = [];
  for (const key of requiredVars) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  return Object.fromEntries(
    requiredVars.map((key) => [key, process.env[key]!])
  ) as EnvVars;
}
