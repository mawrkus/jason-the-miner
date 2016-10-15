const regexpCache = {};

/**
 * Value extractors.
 * The property names can be used to configure the parsing process.
 * @type {Object}
 */
module.exports = {
  "default": $el => $el.text(),
  "text": $el => $el.text(),
  "html": $el => $el.html(),
  "attr": ($el, attr) => $el.attr(attr) || '',
  "regexp": ($el, regexpString) => {
    let regexp = regexpCache[regexpString];
    if (!regexp) {
      regexp = regexpCache[regexpString] = new RegExp(regexpString);
    }
    const matches = regexp.exec($el.text());
    return (matches && matches[1]) || '';
  }
};
