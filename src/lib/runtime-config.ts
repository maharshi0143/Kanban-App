export function getInternalToken(): string {
  const token = process.env.SOCKET_INTERNAL_TOKEN;

  if (!token) {
    throw new Error('SOCKET_INTERNAL_TOKEN is required');
  }

  return token;
}

export function getSocketAllowedOrigins(): string[] {
  const raw = process.env.SOCKET_ALLOWED_ORIGINS?.trim();
  if (!raw) {
    return ['http://localhost:3000'];
  }

  return raw
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}
