export const scrollToTop = () => {
  if (typeof window === 'undefined') return;
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

export const pushUnique = (items: string[], value: string | null | undefined) => {
  if (!value) return;
  const normalized = value.trim();
  if (!normalized || items.includes(normalized)) return;
  items.push(normalized);
};
