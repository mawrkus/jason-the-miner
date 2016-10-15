const REGEXP_DIGITS_ONLY = /\D/g;

/**
 * Text filters.
 * The property names can be used to configure the parsing process.
 * @type {Object}
 */
module.exports = {
  "default": text => text,
  "trim": text => text.trim(),
  "digits": text => text.replace(REGEXP_DIGITS_ONLY, '')
};
