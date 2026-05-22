import type { Card } from '@/lib/types';

export function sortCards(cards: Card[]): Card[] {
  return [...cards].sort((a, b) => (a.position === b.position ? a.id - b.id : a.position - b.position));
}

export function calculatePosition(cards: Card[], targetIndex: number): number {
  if (cards.length === 0) {
    return 1;
  }

  if (targetIndex <= 0) {
    return cards[0].position / 2;
  }

  if (targetIndex >= cards.length) {
    return cards[cards.length - 1].position + 1;
  }

  return (cards[targetIndex - 1].position + cards[targetIndex].position) / 2;
}
