import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';

/**
 * The lint rules every BUSY Bar app shares. `rootDir` is the app's own
 * directory, so type-aware rules read that app's tsconfig:
 *
 *     import { barEslintConfig } from 'busybar-kit/eslint';
 *     export default barEslintConfig(import.meta.dirname);
 */
export function barEslintConfig(rootDir, ...extra) {
  return tseslint.config(
    { ignores: ['dist/**', 'node_modules/**', 'scripts/**'] },
    js.configs.recommended,
    ...tseslint.configs.recommendedTypeChecked,
    {
      languageOptions: {
        parserOptions: {
          project: ['./tsconfig.json'],
          tsconfigRootDir: rootDir,
        },
      },
      rules: {
        '@typescript-eslint/no-unused-vars': [
          'error',
          { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
        ],
        '@typescript-eslint/consistent-type-imports': [
          'error',
          { fixStyle: 'inline-type-imports' },
        ],
        '@typescript-eslint/no-floating-promises': 'error',
        '@typescript-eslint/switch-exhaustiveness-check': 'error',
        eqeqeq: ['error', 'always'],
        'no-console': 'off',
        'prefer-const': 'error',
      },
    },
    {
      files: ['test/**/*.ts'],
      rules: {
        '@typescript-eslint/no-non-null-assertion': 'off',
        // node:test returns a promise that is meant to be left alone
        '@typescript-eslint/no-floating-promises': 'off',
        '@typescript-eslint/require-await': 'off',
      },
    },
    {
      files: ['**/*.js'],
      extends: [tseslint.configs.disableTypeChecked],
    },
    prettier,
    ...extra,
  );
}

export default barEslintConfig(import.meta.dirname);
