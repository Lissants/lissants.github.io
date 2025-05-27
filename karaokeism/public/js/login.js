document.addEventListener('DOMContentLoaded', () => {
  if (!document.getElementById('login-form')) return;

  const loginForm = document.getElementById('login-form');
  const identifierInput = document.getElementById('identifier');
  const passwordInput = document.getElementById('password');
  const loginButton = document.getElementById('login-btn');
  const identifierError = document.getElementById('identifier-error');
  const passwordError = document.getElementById('password-error');
  const togglePassword = document.getElementById('toggle-password');

  // Add null checks for error elements
  if (!identifierError || !passwordError) {
    console.error('Error elements not found');
    return;
  }

  // Password toggle functionality
  if (togglePassword && passwordInput) {
    togglePassword.addEventListener('click', () => {
      const isPassword = passwordInput.type === 'password';
      passwordInput.type = isPassword ? 'text' : 'password';
      togglePassword.innerHTML = isPassword ? 
        '<i class="fa-solid fa-eye-slash fa-lg"></i>' :
        '<i class="fa-solid fa-eye fa-lg"></i>';
    });
  }

  // Validation function
  function validateLoginForm() {
    const identifierValid = identifierInput.value.trim() !== '';
    const passwordValid = passwordInput.value.trim() !== '';

    // Update error messages
    identifierError.textContent = identifierValid ? '' : '❌ This field cannot be empty';
    passwordError.textContent = passwordValid ? '' : '❌ This field cannot be empty';

    // Update button state
    if (loginButton) {
      loginButton.disabled = !(identifierValid && passwordValid);
    }
  }

  validateLoginForm();

  if (identifierInput) identifierInput.addEventListener('input', validateLoginForm);
  if (passwordInput) passwordInput.addEventListener('input', validateLoginForm);

  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      if (loginButton && loginButton.disabled) {
        e.preventDefault();
        validateLoginForm();
      }
    });
  }
});