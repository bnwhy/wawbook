/**
 * Format a price to the French format: NN,NN €
 * @param price - The price as a number
 * @returns Formatted price string
 */
export const formatPrice = (price: number | undefined | null): string => {
  if (price === undefined || price === null) {
    return '0,00 €';
  }
  const numPrice = typeof price === 'number' ? price : parseFloat(String(price));
  if (isNaN(numPrice)) {
    return '0,00 €';
  }
  return `${numPrice.toFixed(2).replace('.', ',')} €`;
};

import { BookProduct } from '../types/admin';

/**
 * Returns the minimum cover type price and whether multiple types exist.
 * Falls back to book.price if no coverTypes are configured.
 */
export function getMinCoverPrice(book: BookProduct): { price: number; hasMultiple: boolean } {
  const types = book.features?.coverTypes;
  if (types && types.length > 0) {
    return { price: Math.min(...types.map(c => c.price)), hasMultiple: types.length > 1 };
  }
  return { price: Number(book.price), hasMultiple: false };
}

/**
 * Format a price with option to show "Gratuit" for zero prices
 * @param price - The price as a number
 * @param showFreeText - Whether to show "Gratuit" for 0 prices
 * @returns Formatted price string
 */
export const formatPriceWithFree = (price: number | undefined | null, showFreeText: boolean = true): string => {
  if (price === undefined || price === null) {
    return showFreeText ? 'Gratuit' : '€ 0,00';
  }
  const numPrice = typeof price === 'number' ? price : parseFloat(String(price));
  if (isNaN(numPrice) || (numPrice === 0 && showFreeText)) {
    return 'Gratuit';
  }
  return formatPrice(numPrice);
};
