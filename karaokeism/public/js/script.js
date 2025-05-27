document.getElementById('username').addEventListener('input', async (e) => {
  const username = e.target.value;
  const response = await fetch(`/api/check-username?username=${username}`);
  const exists = await response.json();
  showWarning(exists ? 'Username taken' : '');
});
