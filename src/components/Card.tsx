'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { ReactElement } from 'react';
import type { Card as CardType } from '@/lib/types';

type CardProps = {
  card: CardType;
  columnId: number;
  columnName: string;
  isSelected: boolean;
  onSelect: (card: CardType) => void;
  onEdit: (card: CardType) => void;
  onDelete: (card: CardType) => void;
};

function getStatusKind(columnName: string): 'todo' | 'pending' | 'done' | null {
  const name = columnName.trim().toLowerCase();
  if (name.includes('done')) {
    return 'done';
  }
  if (name.includes('pending')) {
    return 'pending';
  }
  if (name.includes('to do') || name.includes('todo')) {
    return 'todo';
  }
  return null;
}

function getStatusSymbol(kind: 'todo' | 'pending' | 'done'): string {
  switch (kind) {
    case 'done':
      return '✓';
    case 'pending':
      return '⏳';
    case 'todo':
      return '○';
    default:
      return '';
  }
}

export function Card({ card, columnId, columnName, isSelected, onSelect, onEdit, onDelete }: CardProps): ReactElement {
  const statusKind = getStatusKind(columnName);
  const statusSymbol = statusKind ? getStatusSymbol(statusKind) : null;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `card-${card.id}`,
    data: { type: 'card', cardId: card.id, columnId }
  });

  return (
    <article
      ref={setNodeRef}
      className={`card ${isSelected ? 'card-selected' : ''}`}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1
      }}
      {...attributes}
      {...listeners}
      onClick={() => onSelect(card)}
      onDoubleClick={() => onEdit(card)}
    >
      <div className="card-top-row">
        <h4 className="card-title">
          {statusSymbol ? (
            <span className={`card-status status-${statusKind}`} aria-hidden="true">
              {statusSymbol}
            </span>
          ) : null}
          {card.title}
        </h4>
        <div className="card-actions">
          <button
            type="button"
            className="card-action-btn"
            onClick={(event) => {
              event.stopPropagation();
              onEdit(card);
            }}
            aria-label="Edit card"
          >
            ✎
          </button>
          <button
            type="button"
            className="card-action-btn danger"
            aria-label="Delete card"
            onClick={(event) => {
              event.stopPropagation();
              onDelete(card);
            }}
          >
            🗑
          </button>
        </div>
      </div>
      {card.description ? <p>{card.description}</p> : null}
      <div className="card-meta-row">
        <span className="chip">#{card.id}</span>
        <span className="chip muted">pos {card.position.toFixed(2)}</span>
      </div>
    </article>
  );
}
