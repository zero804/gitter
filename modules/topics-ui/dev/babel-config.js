module.exports = {
  cache: false,
  extensions: [".js", ".jsx"],
  plugins: [
    "add-module-exports"
  ].map(function(name) { return require.resolve('babel-plugin-' + name); })
};
