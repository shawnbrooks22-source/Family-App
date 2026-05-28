module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Hermes (React Native's JS engine) rejects import(variable) syntax at compile time.
      // @supabase/supabase-js uses import(OTEL_PKG) to optionally load @opentelemetry/api.
      // This plugin replaces any non-literal dynamic import with Promise.resolve({}) so
      // Hermes never sees the forbidden syntax. Metro's empty-module resolver then handles
      // any @opentelemetry string literals that remain.
      function hermesCompatDynamicImport({ types: t }) {
        return {
          visitor: {
            ImportExpression(path) {
              const arg = path.node.source;
              if (arg.type !== 'StringLiteral' && arg.type !== 'TemplateLiteral') {
                path.replaceWith(
                  t.callExpression(
                    t.memberExpression(
                      t.identifier('Promise'),
                      t.identifier('resolve')
                    ),
                    [t.objectExpression([])]
                  )
                );
              }
            },
          },
        };
      },
    ],
  };
};
