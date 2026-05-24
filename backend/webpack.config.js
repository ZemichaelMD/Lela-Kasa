module.exports = function (options) {
  return {
    ...options,
    resolve: {
      ...options.resolve,
      // Allow TypeScript source files to be found when imports use .js extensions
      // (ESM-style TypeScript convention: `import './foo.js'` resolves `foo.ts`)
      extensionAlias: {
        '.js': ['.ts', '.js'],
        '.mjs': ['.mts', '.mjs'],
      },
    },
  };
};
