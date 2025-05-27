document.addEventListener('DOMContentLoaded', () => {
  if (!document.getElementById('register-btn')) return;
  let isUsernameAvailable = false;
  let isEmailAvailable = false;
  
  const registerButton = document.getElementById('register-btn');
  const formFields = {
    displayname: document.getElementById('displayname'),
    username: document.getElementById('username'),
    email: document.getElementById('email'),
    age: document.getElementById('age'),
    password: document.getElementById('password'),
    country: document.getElementById('country'),
    terms: document.getElementById('terms')
  };

  formFields.password.addEventListener('input', updateRegisterButton);

  // Username Availability Check
  const usernameField = document.getElementById('username');
  if (usernameField) {
    const availabilitySpan = document.getElementById('username-availability');
    usernameField.addEventListener('input', async () => {
      const username = usernameField.value.toLowerCase().trim();
      if (!username) {
        availabilitySpan.textContent = '';
        isUsernameAvailable = false;
        updateRegisterButton();
        return;
      }
      try {
        const response = await fetch(`/auth/check-username?username=${username}`);
        const { available } = await response.json();
        isUsernameAvailable = available;
        availabilitySpan.textContent = available ? '✅ Available' : '❌ Taken';
        availabilitySpan.style.color = available ? 'green' : 'red';
      } catch (error) {
        console.error('Error checking username:', error);
        isUsernameAvailable = false;
        availabilitySpan.textContent = '❌ Error checking availability';
        availabilitySpan.style.color = 'red';
      }
      updateRegisterButton();
    });
  }

  // Email Availability Check
  const emailField = document.getElementById('email');
  if (emailField) {
    const emailAvailabilitySpan = document.getElementById('email-availability');
    emailField.addEventListener('input', async () => {
      const email = emailField.value.toLowerCase().trim();
      if (!email) {
        emailAvailabilitySpan.textContent = '';
        isEmailAvailable = false;
        updateRegisterButton();
        return;
      }
      try {
        const response = await fetch(`/auth/check-email?email=${email}`);
        const { available } = await response.json();
        isEmailAvailable = available;
        emailAvailabilitySpan.textContent = available ? '✅ Available' : '❌ Taken';
        emailAvailabilitySpan.style.color = available ? 'green' : 'red';
      } catch (error) {
        console.error('Error checking email:', error);
        isEmailAvailable = false;
        emailAvailabilitySpan.textContent = '❌ Error checking availability';
        emailAvailabilitySpan.style.color = 'red';
      }
      updateRegisterButton();
    });
  }

  // Password Visibility Toggle
  const togglePassword = document.getElementById('toggle-password');
  if (togglePassword) {
    togglePassword.addEventListener('click', () => {
      const passwordField = document.getElementById('password');
      const isPassword = passwordField.type === 'password';
      passwordField.type = isPassword ? 'text' : 'password';
      togglePassword.innerHTML = isPassword ? 
        '<i class="fa-solid fa-eye-slash fa-lg"></i>' :
        '<i class="fa-solid fa-eye fa-lg"></i>';
    });
  }

  // Update Register Button State
  function updateRegisterButton() {
    const isUsernameEmpty = formFields.username.value.trim() === '';
    const isEmailEmpty = formFields.email.value.trim() === '';
    const passwordValid = validatePassword();
    
    const validations = {
      displayname: formFields.displayname.value.trim() !== '',
      username: !isUsernameEmpty && isUsernameAvailable,
      email: !isEmailEmpty && isEmailAvailable,
      age: formFields.age.value.trim() !== '',
      password: passwordValid,
      country: formFields.country.value !== '',
      terms: formFields.terms.checked
    };

    const allValid = Object.values(validations).every(Boolean);
    registerButton.disabled = !allValid;

    // Update Error Messages
    document.getElementById('username-error').textContent = 
      isUsernameEmpty ? '❌ This field cannot be empty' :
      !isUsernameAvailable ? '❌ Username is taken' : '';
    
    document.getElementById('email-error').textContent = 
      isEmailEmpty ? '❌ This field cannot be empty' :
      !isEmailAvailable ? '❌ Email is registered' : '';

    document.getElementById('password-error').textContent =
      passwordValid ? '' : '❌ Password requirements not met';
  }

  // Password Validation
  function validatePassword() {
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(formFields.password.value);
  }

  // Event Listeners for Input Validation
  Object.keys(formFields).forEach(fieldId => {
    if (fieldId === 'terms') {
      formFields[fieldId].addEventListener('change', updateRegisterButton);
    } else if (fieldId !== 'password' && fieldId !== 'country') {
      formFields[fieldId].addEventListener('input', () => {
        if (fieldId === 'username' || fieldId === 'email') return;
        const errorId = `${fieldId}-error`;
        const isValid = formFields[fieldId].value.trim() !== '';
        document.getElementById(errorId).textContent = isValid ? '' : '❌ This field cannot be empty';
        updateRegisterButton();
      });
    }
  });

  // Country Select Change Listener
  $('#country').on('change', () => {
    document.getElementById('country-error').textContent = 
      formFields.country.value ? '' : '❌ Please select a country';
    updateRegisterButton();
  });
});