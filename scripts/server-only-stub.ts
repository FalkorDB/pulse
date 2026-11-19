// No-op stand-in for the `server-only` guard when lib modules run in plain
// Node CLI scripts (tsx). The real package throws outside a React Server
// environment; scripts are legitimately server-side, so we neutralize it here
// via tsconfig.scripts.json path mapping. The Next build still uses the real one.
export {};
