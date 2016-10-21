const REGEXP_SINGLE_SPACE = /\s\s+/g;

/**
 * Text filters.
 * The property names can be used to configure the parsing process.
 * @type {Object}
 */
module.exports = {
  "default": text => text,
  "trim": text => text.trim(),
  "single-space": text => text.replace(REGEXP_SINGLE_SPACE, ' ').trim()
};
