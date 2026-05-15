import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import astro from 'eslint-plugin-astro';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactHooks from 'eslint-plugin-react-hooks';

export default [
  {
    ignores: [
      'dist/**',
      '.astro/**',
      'node_modules/**',
      'planner-api/**',
      'playwright-report/**',
      'test-results/**',
      'blob-report/**',
      'coverage/**',
      'verification-screenshots/**',
      '.build-stamps/**',
      'public/**',
      '**/*.min.js',
      // eslint-plugin-astro's parser errors on certain inline-script layouts
      // that astro check already validates fine. Skip rather than rewrite the
      // page just to please the linter.
      'src/pages/demos/prop.astro',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...astro.configs.recommended,
  {
    files: ['**/*.{ts,tsx,js,jsx,mjs,cjs}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      'jsx-a11y': jsxA11y,
      'react-hooks': reactHooks,
    },
    rules: {
      ...jsxA11y.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      // Baseline: keep authoring noise low while we ratchet quality. Most of
      // these are demoted from "error" to "warn" so the new CI gate enforces
      // type-check + format strictly, without forcing a large code cleanup.
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-require-imports': 'warn',
      '@typescript-eslint/ban-ts-comment': 'warn',
      '@typescript-eslint/no-unused-expressions': 'warn',
      'no-var': 'warn',
      'prefer-const': 'warn',
      'prefer-rest-params': 'warn',
      'no-constant-condition': 'warn',
      'no-empty': 'warn',
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
      // jsx-a11y demotions for the existing demo components — re-enable as we
      // clean each rule up.
      'jsx-a11y/click-events-have-key-events': 'warn',
      'jsx-a11y/no-static-element-interactions': 'warn',
      'jsx-a11y/mouse-events-have-key-events': 'warn',
      'jsx-a11y/label-has-associated-control': 'warn',
      'jsx-a11y/no-noninteractive-element-interactions': 'warn',
      'jsx-a11y/no-autofocus': 'warn',
      'jsx-a11y/anchor-is-valid': 'warn',
      'jsx-a11y/media-has-caption': 'warn',
      'jsx-a11y/iframe-has-title': 'warn',
      'react-hooks/rules-of-hooks': 'warn',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
  {
    files: ['scripts/**/*.{js,mjs,cjs}', '*.config.{js,mjs,cjs,ts}', 'astro.config.mjs'],
    languageOptions: {
      globals: { ...globals.node },
    },
    rules: {
      'no-console': 'off',
    },
  },
  {
    files: ['e2e/**/*.ts', 'src/__tests__/**/*.ts'],
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
];
