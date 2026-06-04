/**
 * 统一的 API 响应格式工具
 * 解决 API 响应格式不一致的问题
 */

import { NextResponse } from 'next/server'

export type ApiErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'DATABASE_ERROR'
  | 'INTERNAL_ERROR'
  | 'SERVICE_UNAVAILABLE'

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  code?: ApiErrorCode
  meta?: {
    page?: number
    pageSize?: number
    total?: number
    [key: string]: unknown
  }
}

export function apiSuccess<T>(data: T, meta?: ApiResponse['meta']): NextResponse {
  return NextResponse.json({ success: true, data, meta } as ApiResponse<T>, { status: 200 })
}

export function apiCreated<T>(data: T): NextResponse {
  return NextResponse.json({ success: true, data } as ApiResponse<T>, { status: 201 })
}

export function apiError(
  message: string,
  code: ApiErrorCode,
  status: number,
  details?: unknown
): NextResponse {
  const body = { success: false, error: message, code } as ApiResponse
  if (details !== undefined) {
    Object.assign(body, { details })
  }
  return NextResponse.json(body, { status: status })
}

export const apiErrors = {
  unauthorized: (message = 'Authentication required') =>
    apiError(message, 'UNAUTHORIZED', 401),

  forbidden: (message = 'Access denied') =>
    apiError(message, 'FORBIDDEN', 403),

  notFound: (message = 'Resource not found') =>
    apiError(message, 'NOT_FOUND', 404),

  validationError: (message: string, details?: unknown) =>
    apiError(message, 'VALIDATION_ERROR', 400, details),

  databaseError: (message = 'Database operation failed') =>
    apiError(message, 'DATABASE_ERROR', 500),

  internalError: (message = 'Internal server error') =>
    apiError(message, 'INTERNAL_ERROR', 500),

  serviceUnavailable: (message = 'Service temporarily unavailable') =>
    apiError(message, 'SERVICE_UNAVAILABLE', 503),
}

/** 构建分页元信息 */
export function buildPaginationMeta(page: number, pageSize: number, total: number) {
  return {
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
  }
}
