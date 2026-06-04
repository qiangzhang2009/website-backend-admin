/**
 * 结构化日志工具
 * 统一项目中的日志输出格式，支持日志级别、请求追踪和上下文
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

const CURRENT_LEVEL = process.env.LOG_LEVEL
  ? parseInt(process.env.LOG_LEVEL, 10)
  : LogLevel.INFO

/**
 * 生成请求追踪 ID
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
}

interface LogContext {
  requestId?: string
  tenantId?: string
  userId?: string
  [key: string]: unknown
}

const NOOP = () => {}

const formatMessage = (level: string, message: string, context?: LogContext): string => {
  const timestamp = new Date().toISOString()
  const ctxStr = context ? ` ${JSON.stringify(context)}` : ''
  return `[${timestamp}] [${level}] ${message}${ctxStr}`
}

const shouldLog = (level: LogLevel): boolean => level >= CURRENT_LEVEL

const createLogger = (level: LogLevel, levelName: string) => {
  if (!shouldLog(level)) return NOOP

  return (message: string, context?: LogContext) => {
    const formatted = formatMessage(levelName, message, context)
    if (level === LogLevel.ERROR) {
      console.error(formatted)
    } else if (level === LogLevel.WARN) {
      console.warn(formatted)
    } else {
      console.log(formatted)
    }
  }
}

export const logger = {
  debug: createLogger(LogLevel.DEBUG, 'DEBUG'),
  info: createLogger(LogLevel.INFO, 'INFO'),
  warn: createLogger(LogLevel.WARN, 'WARN'),
  error: createLogger(LogLevel.ERROR, 'ERROR'),

  /**
   * 记录 API 请求
   */
  apiRequest: (requestId: string, method: string, path: string, tenantId?: string) => {
    logger.info(`→ ${method} ${path}`, { requestId, tenantId })
  },

  /**
   * 记录 API 响应
   */
  apiResponse: (requestId: string, method: string, path: string, status: number, durationMs: number) => {
    logger.info(`← ${method} ${path} ${status} (${durationMs}ms)`, { requestId })
  },

  /**
   * 记录数据库查询
   */
  dbQuery: (requestId: string, operation: string, table: string, durationMs: number) => {
    logger.debug(`DB ${operation} on ${table} (${durationMs}ms)`, { requestId })
  },

  /**
   * 记录认证事件
   */
  auth: (event: 'login' | 'logout' | 'fail' | 'expired', requestId?: string) => {
    logger.info(`Auth: ${event}`, { requestId })
  },
}
