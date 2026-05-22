import { z } from 'zod';
import type { ReactElement } from 'react';
import { KanbanBoard } from '@/components/KanbanBoard';

const paramsSchema = z.object({ id: z.coerce.number().int().positive() });

export default async function BoardPage({ params }: { params: Promise<{ id: string }> }): Promise<ReactElement> {
  const routeParams = await params;
  const { id } = paramsSchema.parse(routeParams);

  return (
    <main className="page-shell">
      <KanbanBoard boardId={id} />
    </main>
  );
}
