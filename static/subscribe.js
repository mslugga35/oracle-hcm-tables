function handleSubscribe(e, formId, source, type) {
  e.preventDefault();
  var form = document.getElementById(formId);
  var email = form.querySelector('input[name="email"]').value.trim();
  var btn = form.querySelector('button[type="submit"]');
  var msg = document.querySelector('.form-msg[data-form="' + formId + '"]');
  var origText = btn.textContent;

  btn.disabled = true;
  btn.textContent = 'Sending...';

  fetch('/api/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email, source: source, type: type || 'lead' })
  })
  .then(function(r) { return r.json().then(function(d) { return { ok: r.ok, data: d }; }); })
  .then(function(res) {
    if (res.ok) {
      form.innerHTML = '<p style="color:#4ade80;font-weight:600;margin:0.5rem 0">Sent! Check your inbox.</p>';
      if (msg) msg.style.display = 'none';
    } else {
      btn.disabled = false;
      btn.textContent = origText;
      if (msg) { msg.textContent = res.data.error || 'Something went wrong.'; msg.style.color = '#f87171'; }
    }
  })
  .catch(function() {
    btn.disabled = false;
    btn.textContent = origText;
    if (msg) { msg.textContent = 'Network error. Please try again.'; msg.style.color = '#f87171'; }
  });

  return false;
}
