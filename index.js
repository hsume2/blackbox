module.exports = (process && process.env && process.env.CHUCK_COV)
  ? require('./lib-cov/blackbox')
  : require('./lib/blackbox');
