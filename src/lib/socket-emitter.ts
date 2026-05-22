import { getInternalToken } from '@/lib/runtime-config';

type SocketEmitRequest = {
  boardId: number;
  event:
    | 'card:created'
    | 'card:moved'
    | 'card:updated'
    | 'card:deleted'
    | 'column:created'
    | 'column:deleted'
    | 'board:cleared';
  payload: Record<string, unknown>;
};

export async function emitBoardEvent(request: SocketEmitRequest): Promise<void> {
  const token = getInternalToken();
  const port = process.env.PORT ?? '3000';

  const response = await fetch(`http://127.0.0.1:${port}/internal/socket-event`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-internal-token': token
    },
    body: JSON.stringify(request),
    cache: 'no-store'
  });

  if (!response.ok) {
    throw new Error(`Socket bridge emit failed with status ${response.status}`);
  }
}
