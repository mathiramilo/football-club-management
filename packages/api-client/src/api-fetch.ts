import {
  APP_VERSION_HEADER,
  type ErrorCode,
  PLATFORM_HEADER,
  type Platform,
} from '@repo/contracts';

import type { ProblemDetails } from './generated/model';

export interface ApiClientConfig {
  baseUrl: string;
  appVersion: string;
  platform: Platform;
  locale?: string;
  credentials?: RequestCredentials;
  getAuthHeaders?: () => Record<string, string> | Promise<Record<string, string>>;
  onUpdateRequired?: () => void;
}

export class ApiError extends Error {
  readonly code: string;

  constructor(
    readonly status: number,
    readonly problem: ProblemDetails | undefined,
  ) {
    super(problem?.title ?? `Request failed with status ${String(status)}`);
    this.name = 'ApiError';
    this.code = problem?.code ?? (status >= 500 ? 'INTERNAL_ERROR' : 'BAD_REQUEST');
  }
}

export type ErrorType<Error> = ApiError & { problem: Error | undefined };
export type BodyType<Body> = Body;

const UPDATE_REQUIRED: ErrorCode = 'APP_UPDATE_REQUIRED';
const UPDATE_REQUIRED_STATUS = 426;

let clientConfig: ApiClientConfig | undefined;

export function configureApiClient(config: ApiClientConfig): void {
  clientConfig = config;
}

const isProblem = (response: Response) =>
  response.headers.get('content-type')?.startsWith('application/problem+json') === true;

async function readBody(response: Response): Promise<unknown> {
  const text = await response.text();
  return text === '' ? undefined : JSON.parse(text);
}

export async function apiFetch<T>(url: string, init: RequestInit = {}): Promise<T> {
  if (!clientConfig) throw new Error('Call configureApiClient before the first request');
  const { baseUrl, appVersion, platform, locale, credentials, getAuthHeaders, onUpdateRequired } =
    clientConfig;

  const headers = new Headers(init.headers);
  headers.set(APP_VERSION_HEADER, appVersion);
  headers.set(PLATFORM_HEADER, platform);
  if (locale) headers.set('Accept-Language', locale);
  for (const [name, value] of Object.entries((await getAuthHeaders?.()) ?? {})) {
    headers.set(name, value);
  }

  const response = await fetch(`${baseUrl}${url}`, { ...init, headers, credentials });
  if (!response.ok) {
    const error = new ApiError(
      response.status,
      isProblem(response) ? ((await readBody(response)) as ProblemDetails) : undefined,
    );
    if (response.status === UPDATE_REQUIRED_STATUS || error.code === UPDATE_REQUIRED) {
      onUpdateRequired?.();
    }
    throw error;
  }
  return (await readBody(response)) as T;
}
