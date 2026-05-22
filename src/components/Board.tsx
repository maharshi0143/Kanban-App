'use client';

import { type ReactElement } from 'react';
import { Column } from '@/components/Column';
import type { Card, Column as ColumnType } from '@/lib/types';

type BoardProps = {
  name: string;
  columns: ColumnType[];
  selectedCardId: number | null;
  onSelectCard: (card: Card) => void;
  onEditCard: (card: Card) => void;
  onDeleteCard: (card: Card) => Promise<void>;
  onDeleteColumn: (column: ColumnType) => Promise<void>;
  onCreateCard: (columnId: number, title: string, description: string | null) => Promise<void>;
  onAddColumn: () => Promise<void>;
  onClearBoard: () => Promise<void>;
};

export function Board({
  name,
  columns,
  selectedCardId,
  onSelectCard,
  onEditCard,
  onDeleteCard,
  onDeleteColumn,
  onCreateCard,
  onAddColumn,
  onClearBoard
}: BoardProps): ReactElement {
  return (
    <>
      <header className="board-toolbar">
        <div className="board-title-wrap">
          <div className="board-title-stack">
            <h1>Task Management Kanban Board</h1>
            <p>{name}</p>
          </div>
        </div>
        <div className="board-toolbar-actions">
          <button type="button" className="toolbar-btn toolbar-btn-primary" onClick={onAddColumn}>
            + Add Column
          </button>
          <button type="button" className="toolbar-btn toolbar-btn-secondary" onClick={onClearBoard}>
            Clear Board
          </button>
        </div>
      </header>
      <div className="board-grid">
        {columns.map((column) => (
          <Column
            key={column.id}
            column={column}
            selectedCardId={selectedCardId}
            onSelectCard={onSelectCard}
            onEditCard={onEditCard}
            onDeleteCard={onDeleteCard}
            onDeleteColumn={onDeleteColumn}
            onCreateCard={onCreateCard}
          />
        ))}
      </div>
    </>
  );
}
