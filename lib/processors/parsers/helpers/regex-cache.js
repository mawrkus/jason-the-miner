module.exports = {
  _store: {},

  /**
   * @param  {string} regexString
   * @return {RegExp}
   */
  get(regexString) {
    let regex = this._store[regexString];
    if (!regex) {
      regex = this._store[regexString] = new RegExp(regexString);
    }
    return regex;
  }
};
