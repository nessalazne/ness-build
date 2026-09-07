(() => {
  'use strict';
  const api = 'https://app.digicuratoragency.com/aica/bundle';
  const details = document.querySelector('.standalone-details');
  const form = document.getElementById('bundle-checkout-form');
  const email = document.getElementById('bundle-email');
  const status = document.getElementById('bundle-checkout-status');
  const buttons = [...form.querySelectorAll('[data-provider]')];
  let settings = null;
  let loading = false;
  let submitting = false;

  function message(text, error = false) {
    status.textContent = text;
    status.dataset.error = String(error);
  }

  function updateButtons() {
    buttons.forEach(button => {
      button.disabled = submitting || !settings?.[button.dataset.provider];
    });
  }

  async function loadOptions() {
    if (loading || settings) return;
    loading = true;
    message('Loading payment options…');
    try {
      const response = await fetch(api + '/config', { signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw new Error('Payment options could not load. Close and reopen this section to retry.');
      const data = await response.json();
      if (data.amount_cents !== 14700 || data.currency !== 'usd') {
        throw new Error('The checkout price has changed. Please refresh this page before continuing.');
      }
      if (!data.stripe && !data.paypal) throw new Error('Checkout is temporarily unavailable. Please try again later.');
      settings = data;
      message('Choose card or PayPal to continue to secure checkout.');
    } catch (error) {
      message(error.name === 'TimeoutError' ? 'Payment options took too long to load. Close and reopen this section to retry.' : error.message, true);
    } finally {
      loading = false;
      updateButtons();
    }
  }

  details.addEventListener('toggle', () => { if (details.open) loadOptions(); });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (submitting || !form.reportValidity()) return;
    const provider = event.submitter?.dataset.provider || 'stripe';
    if (!settings?.[provider]) return;
    submitting = true;
    updateButtons();
    message('Opening secure checkout…');
    try {
      const response = await fetch(api + '/checkout/' + provider, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.value.trim() }),
        signal: AbortSignal.timeout(45000),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Checkout could not open. Please try again.');
      const url = new URL(data.url);
      const hosts = provider === 'stripe' ? ['checkout.stripe.com'] : ['www.paypal.com', 'www.sandbox.paypal.com'];
      if (url.protocol !== 'https:' || !hosts.includes(url.hostname)) throw new Error('Checkout returned an unexpected address. Please try again.');
      window.location.assign(url.href);
    } catch (error) {
      message(error.name === 'TimeoutError' ? 'Checkout took too long to open. Please try again.' : error.message, true);
      submitting = false;
      updateButtons();
    }
  });
  window.addEventListener('pageshow', () => { submitting = false; updateButtons(); });
  if (new URLSearchParams(window.location.search).get('bundle') === 'canceled') {
    details.open = true;
  }
})();
