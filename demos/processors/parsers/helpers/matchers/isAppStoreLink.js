const url = require('url');

const appStores = {
  'play.google.com': {
    appPathRegex: /\/store\/apps\/details/,
  },
  'itunes.apple.com': {
    appPathRegex: /.+\/app(\/.+)?\/id([0-9]+)/,
  },
};

module.exports = ($el) => {
  const href = ($el.attr('href') || '').trim();

  if (!href || href === '#') {
    return false;
  }

  const { host, pathname } = url.parse(href);
  if (!host || !pathname) {
    return false;
  }

  const supportedHost = appStores[host];
  if (!supportedHost) {
    return false;
  }

  return !!pathname.match(supportedHost.appPathRegex);
};
