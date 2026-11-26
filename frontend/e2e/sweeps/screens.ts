/** The screens every sweep visits. Each journey adds its screens and states here. */
export const SCREENS = [
  { name: 'browse', path: '/' },
  { name: 'not-found', path: '/no-such-page' },
] as const;

export const WIDTHS = [320, 360, 576, 768, 992, 1200, 1440] as const;
