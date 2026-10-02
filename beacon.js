(function () {
  var base = window.CDA_LOG_URL;
  if (!base) return;
  try {
    var p = encodeURIComponent(location.pathname + location.search);
    fetch(String(base).replace(/\/$/, "") + "/t?p=" + p, {
      method: "GET",
      mode: "no-cors",
      keepalive: true,
      credentials: "omit",
      cache: "no-store"
    });
  } catch (e) {}
})();
