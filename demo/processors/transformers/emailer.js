const nodemailer = require('nodemailer');
const debug = require('debug')('jason:out:emailer');

class Emailer {

  constructor(config) {
    this._config = config;
    debug('Emailer instance created.');
    debug('config', config);
  }

  run(results) {
    debug('Sending results to "%s"...', this._config.to);

    return new Promise((resolve, reject) => {
      const mailOptions = {
        from: this._config.from,
        to: this._config.to,
        subject: results.subject || this._config.subject,
        text: results.body || results,
        html: results.body || results
      };

      // debug('Mail options', mailOptions);

      nodemailer.createTransport(this._config.smtp)
        .sendMail(mailOptions, (error, info) => {
          if (error) {
            debug(error.message);
            reject(error);
            return;
          }

          debug('Message sent:', info.response);
          resolve(info);
        });
    });
  }

}

module.exports = Emailer;
