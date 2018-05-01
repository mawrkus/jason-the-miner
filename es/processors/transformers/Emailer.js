const nodemailer = require('nodemailer');
const debug = require('debug')('jason:transform:email');

/**
 * A processor that emails results. Depends on the "nodemailer" package.
 * @see https://github.com/nodemailer/nodemailer
 */
class Emailer {
  /**
   * @param {Object} config.smtp
   * @param {Object} config.message
   * @param {string} config.message.from
   * @param {string} config.message.to
   * @param {string} config.message.subject
   * @param {*} ... See the "nodemailer" package for all possible options.
   */
  constructor(config) {
    this._config = {
      smtp: {},
      message: {},
      ...config,
    };
    debug('Emailer instance created.');
    debug('config', this._config);
  }

  /**
   * @param {Object} results The results from the previous transformer if any, or the
   * parse results by default
   * @param {string} [results.to]
   * @param {string} [results.subject]
   * @param {string} [results.text]
   * @param {string} [results.html]
   * @param {Object[]} [results.attachments]
   * @param {Object} parseResults The original parse results
   * @return {Promise}
   */
  run({ results }) {
    const { smtp, message } = this._config;
    debug('E-mailing results to "%s"...', message.to);

    return new Promise((resolve, reject) => {
      const jsonResults = JSON.stringify(results);
      const {
        to = message.to,
        subject = message.subject,
        text = jsonResults,
        html = jsonResults,
        attachments = message.attachments,
      } = results;

      const mailOptions = {
        ...message,
        to,
        subject,
        text,
        html,
        attachments,
      };

      debug('Sending e-mail...', mailOptions);

      nodemailer.createTransport(smtp)
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
