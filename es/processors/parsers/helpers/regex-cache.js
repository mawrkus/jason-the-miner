module.exports = {
  _store: {},

  /**
   * @param  {string} regexString
   * @return {RegExp}
   */
  get(regexString) {
    let regex = this._store[regexString];
    if (!regex) {
      regex = new RegExp(regexString);
      this._store[regexString] = regex;
    }
    return regex;
  },
};
