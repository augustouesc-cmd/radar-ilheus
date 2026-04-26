(function () {
  fetch('/weather')
    .then(function (r) { return r.ok ? r.json() : Promise.reject(); })
    .then(function (w) {
      var el = document.querySelector('.top-bar__weather');
      if (!el) return;
      el.innerHTML =
        '<i class="fas fa-cloud-sun" style="color:#F5B400"></i>' +
        ' Ilh\u00e9us \u2022 ' + w.temp + '\u00b0C';
    })
    .catch(function () {
      var el = document.querySelector('.top-bar__weather');
      if (el) el.style.display = 'none';
    });
})();
