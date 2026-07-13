'use strict';

// Shared QR-code modal, bundled into both the forum and admin entries.
//
// Generation is fully client-side (qrcode-generator, the zero-dependency MIT
// reference implementation) so invite links are never sent to a third-party
// image service. The modal shows the QR on a white card -- deliberately not
// theme-colored, since scanners need dark-on-light contrast even on dark
// forums -- with the encoded link underneath and a PNG download sized for
// print use.

var qrcode = require('qrcode-generator');

// Pixels per module in the downloaded PNG. With the 4-module quiet zone this
// yields roughly a 300px image for a typical invite-link QR, which prints
// cleanly at small sizes.
var PNG_CELL = 8;

var QrModal = null;

function trans(key, args) {
  return app.translator.trans('linkrobins-referral.lib.qr.' + key, args);
}

function makeQr(url) {
  // Type 0 auto-picks the smallest version that fits; M error correction is
  // the standard trade-off for screen-displayed codes.
  var qr = qrcode(0, 'M');
  qr.addData(url);
  qr.make();
  return qr;
}

function downloadPng(url, code) {
  var qr = makeQr(url);
  var count = qr.getModuleCount();
  var margin = PNG_CELL * 4; // QR spec quiet zone: 4 modules
  var size = count * PNG_CELL + margin * 2;

  var canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  var ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = '#000000';
  for (var row = 0; row < count; row++) {
    for (var col = 0; col < count; col++) {
      if (qr.isDark(row, col)) {
        ctx.fillRect(margin + col * PNG_CELL, margin + row * PNG_CELL, PNG_CELL, PNG_CELL);
      }
    }
  }

  var link = document.createElement('a');
  link.href = canvas.toDataURL('image/png');
  link.download = 'invite-' + code + '.png';
  document.body.appendChild(link);
  link.click();
  link.remove();
}

// The Modal base class comes from the registry, which is only guaranteed
// populated once the app has booted, so the subclass is defined lazily on
// first open and cached.
function getModalClass() {
  if (QrModal) return QrModal;

  var Modal = flarum.reg.get('core', 'common/components/Modal');
  var Button = flarum.reg.get('core', 'common/components/Button');

  QrModal = class ReferralQrModal extends Modal {
    className() {
      return 'ReferralQrModal Modal--small';
    }

    title() {
      return trans('title', { code: this.attrs.code });
    }

    content() {
      var url = this.attrs.url;
      var code = this.attrs.code;

      // The SVG is generated locally from the invite URL (path geometry
      // only; the URL text itself never appears in the markup), so m.trust
      // is safe here.
      var svg = makeQr(url).createSvgTag({ cellSize: 4, margin: 16, scalable: true });

      return m(
        'div',
        { className: 'Modal-body' },
        m(
          'div',
          { className: 'ReferralQr' },
          m('div', { className: 'ReferralQr-card' }, m.trust(svg)),
          m('div', { className: 'ReferralQr-url' }, url),
          m(
            'div',
            { className: 'ReferralQr-actions' },
            m(
              Button,
              {
                className: 'Button Button--primary',
                icon: 'fas fa-download',
                onclick: function () {
                  downloadPng(url, code);
                },
              },
              trans('download')
            )
          )
        )
      );
    }
  };

  return QrModal;
}

module.exports = {
  show: function (url, code) {
    app.modal.show(getModalClass(), { url: url, code: code });
  },
};
