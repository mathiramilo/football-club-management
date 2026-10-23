import type { ProblemDetails } from './generated/model';

export type Platform = 'ios' | 'android' | 'web';

export interface ApiClientConfig {
  baseUrl: string;
  appVersion: string;
  platform: Platform;
  locale?: string;
  credentials?: RequestCredentials;
  getAuthHeaders?: () => Record<string, string> | Promise<Record<string, string>>;
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
  const { baseUrl, appVersion, platform, locale, credentials, getAuthHeaders } = clientConfig;

  const headers = new Headers(init.headers);
  headers.set('X-App-Version', appVersion);
  headers.set('X-Platform', platform);
  if (locale) headers.set('Accept-Language', locale);
  for (const [name, value] of Object.entries((await getAuthHeaders?.()) ?? {})) {
    headers.set(name, value);
  }

  const response = await fetch(`${baseUrl}${url}`, { ...init, headers, credentials });
  if (!response.ok) {
    throw new ApiError(
      response.status,
      isProblem(response) ? ((await readBody(response)) as ProblemDetails) : undefined,
    );
  }
  return (await readBody(response)) as T;
}
