/**
 * Shared menu category list — single source of truth.
 * Used by admin, manager, customer ordering (online + table QR).
 * Adding a category here automatically propagates to all pages.
 */
export const MENU_CATEGORIES: string[] = [
  'Veg Starters',
  'Non Veg Starters',
  'Veg Biryani',
  'Non Veg Biryani',
  'Main Course Veg',
  'Main Course Non Veg',
  'Tandoori Specials',
  'Rice Items',
  'Indian Breads',
  'Egg Specials',
  'Pot Specials',
  'Arabic Mandi',
  'Beverages',
  'Sweets & Desserts',
];

/** Same list prepended with "All" — used in filter bars. */
export const MENU_CATEGORIES_WITH_ALL: string[] = ['All', ...MENU_CATEGORIES];
