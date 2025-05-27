document.addEventListener('DOMContentLoaded', () => {
  const editProfileBtn = document.getElementById('editProfileBtn');
  const modal = document.getElementById('editProfileModal');
  const closeBtn = modal.querySelector('.close');
  const cancelBtn = modal.querySelector('.cancel-btn');
  const form = document.getElementById('profileForm');
  const fileInput = document.getElementById('profilePicture');
  const imagePreview = document.getElementById('imagePreview');

  // Show modal
  if (editProfileBtn) {
    editProfileBtn.addEventListener('click', () => {
      modal.style.display = 'block';
    });
  }

  // Hide modal
  function closeModal() {
    modal.style.display = 'none';
  }

  closeBtn.addEventListener('click', closeModal);
  cancelBtn.addEventListener('click', closeModal);

  // Image preview
  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        imagePreview.src = event.target.result;
      };
      reader.readAsDataURL(file);
    }
  });

  // Form submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(form);
    
    try {
      const response = await fetch(`/api/profiles/${window.currentUserId}`, {
        method: 'PUT',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to update profile');
      }

      const updatedUser = await response.json();
      
      // Update profile section
      document.querySelector('.profile-text-container h1').textContent = 
        updatedUser.displayName || updatedUser.username;
      document.querySelector('.profile-text-container p').textContent = updatedUser.bio || '';
      document.querySelector('.profile-text-container h3').innerHTML = `
        ${updatedUser.age || '—'}${updatedUser.country ? `, ${updatedUser.country}` : ''}
      `;
      document.querySelector('.profile-container img').src = 
        `/assets/${updatedUser.profilePicture}`;
      
      // Update navbar profile
      const navProfileImg = document.querySelector('.navbar-left img');
      const navProfileName = document.querySelector('.navbar-left p');
      if (navProfileImg) navProfileImg.src = `/assets/${updatedUser.profilePicture}`;
      if (navProfileName) navProfileName.textContent = updatedUser.displayName || updatedUser.username;

      closeModal();
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to update profile. Please try again.');
    }
  });

  // Saved Posts Modal
  const savedPostsModal = document.getElementById('savedPostsModal');
  const viewSavedBtn = document.getElementById('viewSavedPostsBtn');

  if (viewSavedBtn) {
    viewSavedBtn.addEventListener('click', async () => {
      try {
        const response = await fetch(`/api/users/${window.currentUserId}/saved-posts`);
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to load saved posts');
        }
  
        const posts = await response.json();
        
        // Ensure we have an array
        if (!Array.isArray(posts)) {
          throw new Error('Invalid response format');
        }
  
        const container = document.getElementById('saved-posts-container');
        container.innerHTML = posts.map(post => `
          <div class="user-post saved-post-link" data-post-id="${post.id}">
            <!-- Keep your existing post template -->
            <div class="post-profile-picture-container">
              <img src="/assets/${post.author?.profilePicture || 'default-profile.png'}" 
                   alt="Profile Picture">
              <div class="display-name">
                <a href="/profiles/?id=${post.AuthorID}">
                  ${post.author?.displayName || post.author?.username || 'Unknown'}
                </a>
              </div>
            </div>
            <div class="post-text">${post.content}</div>
            ${post.media ? `
              <div class="media-container">
                ${post.media.type === 'image' ? 
                  `<img src="${post.media.url}" alt="Post media">` : 
                post.media.type === 'video' ? 
                  `<video controls><source src="${post.media.url}"></video>` : 
                  `<audio controls><source src="${post.media.url}"></audio>`}
              </div>` : ''}
          </div>
        `).join('');
        
        // Add click handler for saved posts
        container.addEventListener('click', (e) => {
          const postElement = e.target.closest('.saved-post-link');
          if (postElement) {
            const postId = postElement.dataset.postId;
            window.location.href = `/posts?id=${postId}`;
          }
        });
        
        savedPostsModal.style.display = 'block';
      } catch (error) {
        console.error('Error loading saved posts:', error);
        alert(error.message || 'Failed to load saved posts');
      }
    });
  }

  // Close Modal
  document.querySelectorAll('.modal .close').forEach(btn => {
    btn.addEventListener('click', () => {
      btn.closest('.modal').style.display = 'none';
    });
  });

  // Close modal when clicking outside
  window.addEventListener('click', (e) => {
    if (e.target === savedPostsModal) {
      savedPostsModal.style.display = 'none';
    }
  });

  // Grab the ban/unban button if it exists
  const banToggleBtn = document.getElementById('banToggleBtn');
  if (banToggleBtn) {
    banToggleBtn.addEventListener('click', async (e) => {
      const userId = e.target.dataset.userId;                      
      const action = e.target.textContent.trim().startsWith('Ban') 
                    ? 'ban' 
                    : 'unban';
      try {
        const res = await fetch(`/api/users/${userId}/${action}`, { 
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin'
        });
        if (!res.ok) throw new Error('Network response was not ok');
        e.target.textContent = action === 'ban' ? 'Unban User' : 'Ban User';
        e.target.disabled = true;
        setTimeout(() => e.target.disabled = false, 1000);
      } catch (err) {
        console.error(err);
        alert('Failed to ' + action + ' user.');
      }
    });                                                       
  }

  // Add Friend Logic
  document.querySelectorAll('.friend-btn').forEach(button => {
  button.addEventListener('click', async () => {
    const action = button.dataset.action;
    const profileId = window.profileData.profile.id;
    
    try {
      let url, method;
      
      if (action === 'request') {
        url = `/api/friends/${profileId}/request`;
        method = 'POST';
      } else if (action === 'accept') {
        url = `/api/friends/${profileId}/accept`;
        method = 'POST';
      } else if (action === 'reject') {
        url = `/api/friends/${profileId}/reject`;
        method = 'POST';
      } else if (action === 'remove') {
        url = `/api/friends/${profileId}`;
        method = 'DELETE';
      }

      const response = await fetch(url, { method });
      if (!response.ok) throw new Error(await response.text());
      window.location.reload();
    } catch (error) {
      alert(error.message);
    }
  });
});
});