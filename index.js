module.exports = (process && process.env && process.env.BLACKBOX_COV)
  ? require('./lib-cov/blackbox')
  : require('./lib/blackbox');
