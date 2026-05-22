'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { type FormEvent, type ReactElement, useMemo, useState } from 'react';
import { Card } from '@/components/Card';
import { sortCards } from '@/lib/card-order';
import type { Card as CardType, Column as ColumnType } from '@/lib/types';

type ColumnProps = {
  column: ColumnType;
  selectedCardId: number | null;
  onSelectCard: (card: CardType) => void;
  onEditCard: (card: CardType) => void;
  onDeleteCard: (card: CardType) => Promise<void>;
  onDeleteColumn: (column: ColumnType) => Promise<void>;
  onCreateCard: (columnId: number, title: string, description: string | null) => Promise<void>;
};

export function Column({
  column,
  selectedCardId,
  onSelectCard,
  onEditCard,
  onDeleteCard,
  onDeleteColumn,
  onCreateCard
}: ColumnProps): ReactElement {
  const columnIcon = getColumnIcon(column.name);
  const orderedCards = useMemo(() => sortCards(column.cards), [column.cards]);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [inputError, setInputError] = useState<string | null>(null);
  const [isComposerOpen, setIsComposerOpen] = useState(false);

  const { setNodeRef, isOver } = useDroppable({
    id: `column-${column.id}`,
    data: { columnId: column.id }
  });

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    const title = newTitle.trim();

    if (!title) {
      setInputError('Card title is required.');
      return;
    }

    setInputError(null);
    setIsSaving(true);
    try {
      await onCreateCard(column.id, title, newDescription.trim() || null);
      setNewTitle('');
      setNewDescription('');
      setIsComposerOpen(false);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section ref={setNodeRef} className={`column ${isOver ? 'column-over' : ''}`} data-column-id={column.id}>
      <header className="column-header">
        <h3 className="column-title">
          <span className="column-icon" aria-hidden="true">
            {columnIcon}
          </span>
          {column.name}
        </h3>
        <div className="column-tools">
          <button type="button" className="icon-btn" onClick={() => setIsComposerOpen(true)} aria-label="Add card">
            +
          </button>
          <button
            type="button"
            className="icon-btn danger"
            aria-label="Delete column"
            onClick={() => void onDeleteColumn(column)}
          >
            🗑
          </button>
        </div>
      </header>
      {isComposerOpen ? (
        <form className="create-card-form" onSubmit={handleSubmit}>
          <input
            value={newTitle}
            onChange={(event) => setNewTitle(event.target.value)}
            placeholder="Card title"
            maxLength={256}
            aria-label={`Add card to ${column.name}`}
          />
          <textarea
            value={newDescription}
            onChange={(event) => setNewDescription(event.target.value)}
            placeholder="Card content"
            rows={3}
            maxLength={5000}
            aria-label={`Card content for ${column.name}`}
          />
          <button type="submit" disabled={isSaving}>
            {isSaving ? 'Adding...' : 'Add'}
          </button>
        </form>
      ) : null}
      {inputError ? <p className="inline-error">{inputError}</p> : null}
      <SortableContext items={orderedCards.map((card) => `card-${card.id}`)} strategy={verticalListSortingStrategy}>
        <div className="card-list">
          {orderedCards.map((card) => (
            <Card
              key={card.id}
              card={card}
              columnId={column.id}
              columnName={column.name}
              isSelected={selectedCardId === card.id}
              onSelect={onSelectCard}
              onEdit={onEditCard}
              onDelete={(targetCard) => void onDeleteCard(targetCard)}
            />
          ))}
          {orderedCards.length === 0 ? <div className="empty-column">No cards</div> : null}
        </div>
      </SortableContext>
      <button type="button" className="add-task-bar" onClick={() => setIsComposerOpen((value) => !value)}>
        + Add Task
      </button>
    </section>
  );
}

function getColumnIcon(name: string): string {
  const value = name.trim().toLowerCase();
  if (value.includes('done')) {
    return '✅';
  }
  if (value.includes('in progress') || value.includes('progress')) {
    return '⏳';
  }
  if (value.includes('backlog')) {
    return '📥';
  }
  if (value.includes('to do') || value.includes('todo')) {
    return '📝';
  }
  return '📌';
}
