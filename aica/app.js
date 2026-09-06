const choices = [...document.querySelectorAll('.one-time-payment-button')];
choices.forEach((button, index) => {
  button.setAttribute('aria-pressed', String(index === 0));
  button.addEventListener('click', () => {
    choices.forEach(choice => {
      choice.classList.toggle('selected', choice === button);
      choice.setAttribute('aria-pressed', String(choice === button));
    });
    document.querySelector('.total-am').textContent = index === 0 ? 'US$197' : 'US$198';
  });
});
