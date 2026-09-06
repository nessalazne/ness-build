/* AI Creator Academy 2.0 — checkout.
 *
 * This page is static (GitHub Pages), so it never holds a secret key. It asks
 * app.digicuratoragency.com for a publishable key and a client secret, and the
 * money moves through the same Stripe and PayPal accounts that run billing
 * there. Card, bank, Klarna and Afterpay are whatever Stripe's Payment Element
 * offers for the account; PayPal is its own Smart Button underneath.
 *
 * Two prices, and they are NOT the same product to Stripe:
 *   Pay Now      US$197 once   -> a PaymentIntent          (mode: 'payment')
 *   Payment Plan 2 x US$99     -> a 2-invoice subscription (mode: 'subscription')
 * Stripe will not let an Elements group change mode, so switching plans tears
 * the form down and rebuilds it. PayPal has no instalment plan, so its button
 * is hidden on the payment plan rather than quietly charging the full price.
 */

const API_BASE = (window.AICA_API_BASE || 'https://app.digicuratoragency.com/aica')
  .replace(/\/+$/, '');

const ONE_TIME = 'one_time';
const PAYMENT_PLAN = 'payment_plan';

const el = id => document.getElementById(id);

const planButtons = [...document.querySelectorAll('.one-time-payment-button')];
const totalField = document.querySelector('.total-am');
const nameField = el('name');
const emailField = el('email');
const submitButton = el('store-page-submit-button');
const submitLabel = el('aica-submit-label');
const noteField = el('aica-note');
const errorField = el('aica-error');
const paypalWrap = el('aica-paypal-wrap');

let settings = null;          // whatever GET /aica/config answered
let stripe = null;
let elements = null;          // the current Elements group
let paymentElement = null;
let selectedPlan = ONE_TIME;
let busy = false;
let paypalRendered = false;

// --- small helpers ------------------------------------------------------------

const money = cents => 'US$' + (cents / 100).toFixed(cents % 100 ? 2 : 0);

function priceFor(plan) {
  const pricing = settings && settings.pricing;
  if (!pricing) return { amount_cents: plan === ONE_TIME ? 19700 : 9900,
                         total_cents: plan === ONE_TIME ? 19700 : 19800 };
  return plan === ONE_TIME ? pricing.one_time : pricing.payment_plan;
}

function showError(message) {
  errorField.textContent = message || '';
  errorField.classList.toggle('visible', Boolean(message));
}

function showNote(message) {
  noteField.textContent = message || '';
  noteField.hidden = !message;
}

function setBusy(state) {
  busy = state;
  submitButton.disabled = state || !stripe;
  submitLabel.textContent = state ? 'PROCESSING…' : 'PURCHASE';
}

function buyer() {
  return {
    name: (nameField.value || '').trim(),
    email: (emailField.value || '').trim(),
  };
}

/** The one place that decides whether we have enough to charge someone. */
function buyerProblem() {
  const { email } = buyer();
  if (!email) return 'Enter the email address your access should go to.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'That email address does not look right.';
  return null;
}

/** Append a query parameter without assuming the URL has none already. */
function withParam(url, key, value) {
  return url + (url.indexOf('?') === -1 ? '?' : '&')
    + key + '=' + encodeURIComponent(value);
}

async function postJSON(path, body) {
  const response = await fetch(API_BASE + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {}),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
  return data;
}

// --- the plan toggle ----------------------------------------------------------

function selectPlan(plan) {
  selectedPlan = plan;
  planButtons.forEach((button, index) => {
    const isChosen = (index === 0 ? ONE_TIME : PAYMENT_PLAN) === plan;
    button.classList.toggle('selected', isChosen);
    button.setAttribute('aria-pressed', String(isChosen));
  });
  totalField.textContent = money(priceFor(plan).total_cents);
  showError('');
  mountPaymentElement();
  updatePayPalVisibility();
}

planButtons.forEach((button, index) => {
  button.setAttribute('aria-pressed', String(index === 0));
  button.addEventListener('click', () => {
    if (!busy) selectPlan(index === 0 ? ONE_TIME : PAYMENT_PLAN);
  });
});

// --- Stripe -------------------------------------------------------------------

const APPEARANCE = {
  theme: 'stripe',
  variables: {
    colorPrimary: '#4F8A84',
    colorText: '#000000',
    colorDanger: '#b3261e',
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    borderRadius: '8px',
  },
};

/** Build (or rebuild) the payment form for the selected plan. Deferred intent:
 *  no charge exists until PURCHASE is pressed, so browsing the page creates
 *  nothing in Stripe. */
function mountPaymentElement() {
  if (!stripe) return;
  if (paymentElement) {
    paymentElement.unmount();
    paymentElement.destroy();
    paymentElement = null;
  }
  elements = stripe.elements({
    mode: selectedPlan === ONE_TIME ? 'payment' : 'subscription',
    amount: priceFor(selectedPlan).amount_cents,
    currency: (settings && settings.pricing && settings.pricing.currency) || 'usd',
    appearance: APPEARANCE,
  });
  paymentElement = elements.create('payment', { layout: 'tabs' });
  paymentElement.mount('#aica-payment-element');
  showNote(selectedPlan === PAYMENT_PLAN
    ? 'US$99 today, then one more US$99 in a month. Nothing after that.'
    : '');
  submitButton.disabled = busy;
}

async function payWithStripe() {
  const problem = buyerProblem();
  if (problem) { showError(problem); return; }

  setBusy(true);
  showError('');
  try {
    // Validate the card fields before creating anything server side.
    const { error: submitError } = await elements.submit();
    if (submitError) throw new Error(submitError.message);

    const started = await postJSON('/checkout', { ...buyer(), plan: selectedPlan });
    const successUrl = started.success_url || settings.success_url;

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      clientSecret: started.client_secret,
      confirmParams: { return_url: successUrl },
      redirect: 'if_required',
    });
    if (error) throw new Error(error.message);

    // Card payments settle here; Klarna, Afterpay and bank redirects have
    // already left the page and come back to the same URL.
    window.location.assign(paymentIntent
      ? withParam(successUrl, 'payment_intent', paymentIntent.id)
      : successUrl);
  } catch (err) {
    showError(err.message);
    setBusy(false);
  }
}

submitButton.addEventListener('click', () => { if (!busy) payWithStripe(); });

// --- PayPal -------------------------------------------------------------------

function updatePayPalVisibility() {
  if (!paypalWrap) return;
  const available = Boolean(settings && settings.paypal) && selectedPlan === ONE_TIME;
  paypalWrap.hidden = !available;
  if (available && !paypalRendered) renderPayPal();
}

function loadPayPalSdk(clientId, currency) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://www.paypal.com/sdk/js?client-id=' + encodeURIComponent(clientId)
      + '&currency=' + encodeURIComponent(currency || 'USD') + '&intent=capture&components=buttons';
    script.onload = resolve;
    script.onerror = () => reject(new Error('PayPal could not load.'));
    document.head.appendChild(script);
  });
}

async function renderPayPal() {
  paypalRendered = true;
  try {
    await loadPayPalSdk(settings.paypal_client_id, settings.paypal_currency);
    window.paypal.Buttons({
      style: { color: 'gold', shape: 'rect', label: 'paypal', height: 48 },
      createOrder: async () => {
        const problem = buyerProblem();
        if (problem) { showError(problem); throw new Error(problem); }
        showError('');
        const order = await postJSON('/paypal/order', buyer());
        return order.order_id;
      },
      onApprove: async data => {
        setBusy(true);
        const sale = await postJSON('/paypal/capture', { order_id: data.orderID, ...buyer() });
        const successUrl = sale.success_url || settings.success_url;
        window.location.assign(withParam(successUrl, 'paypal', sale.reference));
      },
      onError: () => {
        setBusy(false);
        showError('PayPal could not complete that payment. Please try again or pay by card.');
      },
    }).render('#aica-paypal');
  } catch (err) {
    paypalWrap.hidden = true;   // no PayPal is better than a broken PayPal
  }
}

// --- start --------------------------------------------------------------------

(async function start() {
  try {
    const response = await fetch(API_BASE + '/config');
    if (!response.ok) throw new Error('config');
    settings = await response.json();
  } catch (err) {
    showNote('');
    showError('Checkout is unavailable right now. Please try again in a few minutes.');
    return;
  }

  totalField.textContent = money(priceFor(ONE_TIME).total_cents);

  if (settings.stripe && settings.stripe_publishable_key && window.Stripe) {
    stripe = Stripe(settings.stripe_publishable_key);
    mountPaymentElement();
    submitButton.disabled = false;
  } else {
    showNote('');
    showError('Card payments are unavailable right now.');
  }

  updatePayPalVisibility();
})();
