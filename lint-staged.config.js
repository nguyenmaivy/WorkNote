export default {
  '*.{js,mjs,ts,tsx}': 'eslint',
  '*.{ts,tsx}': () => 'corepack pnpm run typecheck',
};
