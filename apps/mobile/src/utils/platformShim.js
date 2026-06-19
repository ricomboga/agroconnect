// Web shim for react-native Platform — re-export from react-native-web
module.exports = require('react-native-web').Platform || {
  OS: 'web',
  select: (spec) => spec.web || spec.default || spec.native || null,
  isPad: false,
  isTVOS: false,
  isTV: false,
  Version: 0,
};
