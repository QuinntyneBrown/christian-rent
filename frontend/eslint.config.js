// @ts-check
const eslint = require('@eslint/js');
const { defineConfig } = require('eslint/config');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');
const boundaries = require('eslint-plugin-boundaries');

/**
 * Lint for the whole workspace. Besides angular-eslint's recommendations it enforces:
 * - the dependency direction of AGENTS.md (rent → components, api, domain; domain → api;
 *   components → api for types only; api → nothing; nothing imports rent);
 * - no [innerHTML] and no bypassSecurityTrust* (L2-026, criterion 1).
 */
module.exports = defineConfig([
  { ignores: ['dist/', '.angular/', 'test-results/', 'playwright-report/'] },
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      tseslint.configs.recommended,
      tseslint.configs.stylistic,
      angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    plugins: { boundaries },
    settings: {
      'import/resolver': { typescript: { project: './tsconfig.json' } },
      'boundaries/include': ['projects/**/*.ts'],
      'boundaries/elements': [
        { type: 'api', pattern: 'projects/api/**' },
        { type: 'domain', pattern: 'projects/domain/**' },
        { type: 'components', pattern: 'projects/components/**' },
        { type: 'rent', pattern: 'projects/rent/**' },
      ],
    },
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        { type: 'attribute', prefix: 'cr', style: 'camelCase' },
      ],
      '@angular-eslint/component-selector': [
        'error',
        { type: ['element', 'attribute'], prefix: 'cr', style: 'kebab-case' },
      ],
      '@angular-eslint/prefer-on-push-component-change-detection': 'error',
      '@angular-eslint/component-max-inline-declarations': [
        'error',
        { template: 0, styles: 0, animations: 0 },
      ],
      '@angular-eslint/use-component-view-encapsulation': 'error',
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
      'no-restricted-syntax': [
        'error',
        {
          selector: 'MemberExpression[property.name=/^bypassSecurityTrust/]',
          message: 'Member-written text is rendered as text, never trusted as HTML (L2-026).',
        },
      ],
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          policies: [
            {
              from: { element: { type: 'rent' } },
              allow: { to: { element: { types: ['rent', 'components', 'api', 'domain'] } } },
            },
            {
              from: { element: { type: 'domain' } },
              allow: { to: { element: { types: ['domain', 'api'] } } },
            },
            {
              from: { element: { type: 'components' } },
              allow: { to: { element: { types: ['components', 'api'] } } },
            },
            { from: { element: { type: 'api' } }, allow: { to: { element: { types: ['api'] } } } },
          ],
        },
      ],
    },
  },
  {
    // A test-only host component may carry its template inline; product components never do.
    files: ['projects/**/*.spec.ts'],
    rules: { '@angular-eslint/component-max-inline-declarations': 'off' },
  },
  {
    files: ['e2e/**/*.ts'],
    rules: { 'no-empty-pattern': ['error', { allowObjectPatternsAsParameters: true }] },
  },
  {
    files: ['projects/components/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@rent/api',
              allowTypeImports: true,
              message: 'components depends on @rent/api for types only (AGENTS.md).',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['**/*.html'],
    extends: [angular.configs.templateRecommended, angular.configs.templateAccessibility],
    rules: {
      '@angular-eslint/template/no-inline-styles': 'error',
      '@angular-eslint/template/prefer-control-flow': 'error',
      'no-restricted-syntax': 'off',
    },
  },
  {
    files: ['**/*.html'],
    plugins: {
      'rent-template': {
        rules: {
          'no-inner-html': {
            meta: {
              type: 'problem',
              messages: {
                innerHtml:
                  'Render member-written text as text: [innerHTML] is not allowed (L2-026).',
              },
            },
            create(context) {
              return {
                BoundAttribute(node) {
                  if (/^inner(HTML|Html)$/.test(node.name))
                    context.report({ node, messageId: 'innerHtml' });
                },
                TextAttribute(node) {
                  if (/^innerhtml$/i.test(node.name))
                    context.report({ node, messageId: 'innerHtml' });
                },
              };
            },
          },
        },
      },
    },
    rules: { 'rent-template/no-inner-html': 'error' },
  },
]);
