const passwordInput = document.querySelector('#password');
const togglePassword = document.querySelector('#toggle-password');
const loginForm = document.querySelector('#login-form');
const status = document.querySelector('#login-status');

function showStatus(message) {
  status.textContent = message;
  window.clearTimeout(showStatus.timer);
  showStatus.timer = window.setTimeout(() => { status.textContent = ''; }, 4000);
}

togglePassword.addEventListener('click', () => {
  const isPassword = passwordInput.type === 'password';
  passwordInput.type = isPassword ? 'text' : 'password';
  togglePassword.textContent = isPassword ? 'Hide' : 'Show';
});

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!loginForm.checkValidity()) {
    loginForm.reportValidity();
    return;
  }
  const email = document.querySelector('#email').value.trim();
  const authenticated = await ArrivalDB.authenticate(email, document.querySelector('#password').value);
  if (!authenticated) {
    showStatus('Incorrect password. Please try again.');
    return;
  }
  window.location.href = 'index.html?loggedIn=1';
});

document.querySelector('#forgot-link').addEventListener('click', (event) => {
  event.preventDefault();
  showStatus('Password reset instructions are on their way.');
});

document.querySelector('#signup-link').addEventListener('click', (event) => {
  event.preventDefault();
  showStatus('Account creation will be available soon.');
});

document.querySelector('#social-login').addEventListener('click', () => {
  showStatus('Google sign-in will be available soon.');
});
