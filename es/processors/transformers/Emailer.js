const nodemailer = require('nodemailer');
const debug = require('debug')('jason:transform:email');

/**
 * A processor that emails results. Depends on the "nodemailer" package.
 * @see https://github.com/nodemailer/nodemailer
 */
class Emailer {
  /**
   * @param {Object} config.smtp
   * @param {string} config.from
   * @param {string} config.to
   * @param {string} config.subject
   * @param {*} ... See the "nodemailer" package for all possible options.
   */
  constructor(config) {
    this._config = { ...config };
    debug('Emailer instance created.');
    debug('config', config);
  }

  /**
   * @param {Object} results The results from the previous transformer if any, or the
   * parse results by default
   * @param {string} [results.subject]
   * @param {string} [results.body]
   * @param {Object} parseResults The original parse results
   * @return {Promise}
   */
  run({ results }) {
    debug('E-mailing results to "%s"...', this._config.to);

    return new Promise((resolve, reject) => {
      const body = results.body || JSON.stringify(results);
      const mailOptions = {
        from: this._config.from,
        to: this._config.to,
        subject: results.subject || this._config.subject,
        text: body,
        html: body,
      };

      // debug('Sending e-mail...', mailOptions);

      nodemailer.createTransport(this._config.smtp)
        .sendMail(mailOptions, (error, mailInfo) => {
          if (error) {
            debug(error.message);
            reject(error);
            return;
          }

          debug('E-mail sent:', mailInfo.response);
          resolve({ results, mailInfo });
        });
    });
  }
}

module.exports = Emailer;
