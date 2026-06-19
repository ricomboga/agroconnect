module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // WatermelonDB requires this Babel plugin for decorators
      ['@babel/plugin-proposal-decorators', { legacy: true }],
      // Required alongside decorators
      ['@babel/plugin-proposal-class-properties', { loose: true }],
    ],
  };
};
