document.querySelectorAll('.qr-code').forEach(function (box) {
  if (typeof QRCode !== 'undefined') {
    new QRCode(box, { text: box.dataset.token, width: 160, height: 160, colorDark: '#172b4d', colorLight: '#ffffff' });
  }
});
