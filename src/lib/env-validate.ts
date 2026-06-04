/**
 * 环境变量验证
 * 在应用启动时验证关键配置是否存在
 */

export interface EnvValidationResult {
  valid: boolean
  missing: string[]
  warnings: string[]
}

const REQUIRED_ENV_VARS: string[] = []

const RECOMMENDED_ENV_VARS: string[] = [
  'DATABASE_URL',
  'NEXT_PUBLIC_ADMIN_PASSWORD',
  'DEEPSEEK_API_KEY',
]

export function validateEnvironment(): EnvValidationResult {
  const missing: string[] = []
  const warnings: string[] = []

  for (const key of REQUIRED_ENV_VARS) {
    if (!process.env[key]) {
      missing.push(key)
    }
  }

  for (const key of RECOMMENDED_ENV_VARS) {
    if (!process.env[key]) {
      warnings.push(`${key} is not set — some features may not work`)
    }
  }

  if (!process.env.DATABASE_URL) {
    warnings.push('DATABASE_URL not set — running in mock mode (data will not be persisted)')
  }

  if (!process.env.NEXT_PUBLIC_ADMIN_PASSWORD) {
    warnings.push('NEXT_PUBLIC_ADMIN_PASSWORD not set — using default password (admin123), CHANGE THIS IN PRODUCTION!')
  } else if (process.env.NEXT_PUBLIC_ADMIN_PASSWORD === 'admin123') {
    warnings.push('NEXT_PUBLIC_ADMIN_PASSWORD is still the default "admin123" — CHANGE THIS IN PRODUCTION!')
  }

  if (warnings.length > 0) {
    console.warn('[Env] Environment warnings:')
    warnings.forEach(w => console.warn(`  - ${w}`))
  }

  if (missing.length > 0) {
    console.error('[Env] Missing required environment variables:')
    missing.forEach(m => console.error(`  - ${m}`))
  }

  return {
    valid: missing.length === 0,
    missing,
    warnings,
  }
}
