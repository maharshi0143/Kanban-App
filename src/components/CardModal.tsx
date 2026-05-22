'use client';

import { FormEvent, type ReactElement, useState } from 'react';
import type { Card } from '@/lib/types';

type CardModalProps = {
  card: Card;
  onClose: () => void;
  onSaved: (title: string, description: string | null) => Promise<void>;
};

export function CardModal({ card, onClose, onSaved }: CardModalProps): ReactElement {
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description ?? '');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setSaving(true);
    try {
      await onSaved(title, description || null);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(event) => event.stopPropagation()}>
        <h3>Edit card</h3>
        <form onSubmit={handleSubmit}>
          <label>
            Title
            <input value={title} onChange={(event) => setTitle(event.target.value)} required maxLength={256} />
          </label>
          <label>
            Description
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={4}
              maxLength={5000}
            />
          </label>
          <div className="modal-actions">
            <button type="button" onClick={onClose} className="ghost-btn">
              Cancel
            </button>
            <button type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
