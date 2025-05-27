document.addEventListener('click', async (e) => {
  const saveBtn = e.target.closest('.save-post-btn');
  if (!saveBtn) return;

  e.stopPropagation();
  const postId = saveBtn.dataset.postId;
  const icon = saveBtn.querySelector('i');
  const text = saveBtn.querySelector('span');

  try {
    const response = await fetch(`/api/posts/${postId}/save`, { 
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) throw new Error('Failed to save post');
    
    const result = await response.json();
    
    if (result.saved) {
      icon.classList.replace('fa-regular', 'fa-solid');
      text.textContent = 'Saved';
    } else {
      icon.classList.replace('fa-solid', 'fa-regular');
      text.textContent = 'Save';
    }
  } catch (error) {
    console.error('Save post error:', error);
    alert('Failed to save post. Please try again.');
  }
});