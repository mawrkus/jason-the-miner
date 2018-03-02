const REGEX_TRIM = /^\s+|\s+$/g;
const REGEX_SINGLE_SPACE = /\s\s+/g;

/**
 * Text filters.
 * The property names can be used to configure the parsing process.
 * @type {Object}
 */
module.exports = {
  "default": text => text,
  "trim": text => text.replace(REGEX_TRIM, ''),
  "single-space": text => text.replace(REGEX_SINGLE_SPACE, ' ').trim(),
  "lowercase": text => text.toLowerCase(),
  "uppercase": text => text.toUpperCase()
};
