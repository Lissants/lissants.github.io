document.addEventListener('DOMContentLoaded', () => {
  const postForm = document.querySelector('.create-post-container');
  if (!postForm) return;

  const postTextarea = postForm.querySelector('#post-content');
  const submitPostBtn = postForm.querySelector('#submit-post-btn');
  const mediaButton = postForm.querySelector('#media-upload-btn');
  const mediaPreview = postForm.querySelector('#media-preview');

  let currentMedia = null;

mediaButton.addEventListener('click', (e) => {
  e.preventDefault();
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*,video/*,audio/*';
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert('File size exceeds 10MB limit');
        return;
      }

      submitPostBtn.disabled = true;
      mediaButton.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';

      currentMedia = {
        file: file,
        type: file.type.startsWith('image') ? 'image' :
              file.type.startsWith('video') ? 'video' : 'audio',
        url: URL.createObjectURL(file)
      };

      mediaPreview.style.display = 'block';
      mediaPreview.innerHTML = `
        <div class="media-preview-content">
          ${currentMedia.type === 'image' ? 
            `<img src="${currentMedia.url}" alt="Preview">` :
            currentMedia.type === 'video' ?
            `<video controls><source src="${currentMedia.url}"></video>` :
            `<audio controls><source src="${currentMedia.url}"></audio>`
          }
          <button id="remove-media-btn" class="remove-media-btn">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
      `;

      submitPostBtn.disabled = false;
      mediaButton.innerHTML = '<i class="fa-solid fa-image"></i><span>Media</span>';
    }
  };
  input.click();
});
  
mediaPreview.addEventListener('click', (e) => {
  if (e.target.closest('#remove-media-btn')) {
    currentMedia = null;
    mediaPreview.style.display = 'none';
    mediaPreview.innerHTML = '';
  }
});

  submitPostBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    const content = postTextarea.value.trim();

    if (!content && !currentMedia) return;

    try {
      const formData = new FormData();
      formData.append('content', content);
      formData.append('AuthorID', window.appData?.currentUser?.id);
      if (currentMedia) {
        formData.append('media', currentMedia.file);
      }

      const response = await fetch(`api/posts?userId=${window.appData.currentUser.id}`, {
        method: 'POST',
        body: formData
      });  

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create post');
      }

      const newPost = await response.json();
      
      const postElement = createPostElement(newPost);
      const postsContainer = document.querySelector('#posts-container') || 
                           document.querySelector('main') || 
                           document.querySelector('.content-container');
      
      if (postsContainer) {
        postsContainer.insertBefore(postElement, postsContainer.firstChild);
        postElement.scrollIntoView({ behavior: 'smooth' });
      }

      postTextarea.value = '';
      currentMedia = null;
      mediaPreview.style.display = 'none';
      mediaPreview.innerHTML = '';
   
    } catch (error) {
      console.error('Error creating post:', error);
      alert('Failed to create post. Please try again');
    }
  });

  document.addEventListener('click', async (e) => {
    // Delete Post
    if (e.target.closest('.delete-post-btn')) {
      const button = e.target.closest('.delete-post-btn');
      const postId = button.dataset.postId;
      const postElement = button.closest('.user-post');
      
      // Show confirmation modal
      const modal = document.getElementById('confirmationModal');
      const modalTitle = document.getElementById('modalTitle');
      const modalMessage = document.getElementById('modalMessage');
      const modalConfirm = document.getElementById('modalConfirm');
      const modalCancel = document.getElementById('modalCancel');
      
      // Update modal content
      modalTitle.textContent = 'Delete Post';
      modalMessage.textContent = 'Are you sure you want to delete this post?';
      modal.classList.add('show');
  
      // Handle modal actions
      const handleModal = async (confirmed) => {
        if (confirmed) {
          try {
            const response = await fetch(`/api/posts/${postId}?userId=${window.appData.currentUser.id}`, {
              method: 'DELETE'
            });
  
            if (!response.ok) {
              const error = await response.json();
              throw new Error(error.message || 'Failed to delete post');
            }      
  
            postElement.remove();
          } catch (error) {
            console.error('Error deleting post:', error);
            alert(error.message || 'Failed to delete post. Please delete comments first.');
          }
        }
        
        // Cleanup
        modal.classList.remove('show');
        modalConfirm.removeEventListener('click', confirmHandler);
        modalCancel.removeEventListener('click', cancelHandler);
      };
  
      const confirmHandler = () => handleModal(true);
      const cancelHandler = () => handleModal(false);
  
      modalConfirm.addEventListener('click', confirmHandler);
      modalCancel.addEventListener('click', cancelHandler);
    }

    // Edit Post handler
    if (e.target.closest('.edit-post-btn')) {
      const postElement = e.target.closest('.user-post');
      const postId = postElement.dataset.postId;
      const contentElement = postElement.querySelector('.post-text');
      
      // Enter edit mode
      const originalContent = contentElement.textContent;
      const textarea = document.createElement('textarea');
      textarea.className = 'edit-post-input';
      textarea.value = originalContent;
      contentElement.replaceWith(textarea);
    
      // Create edit controls
      const editControls = document.createElement('div');
      editControls.className = 'edit-controls';
      editControls.innerHTML = `
        <button class="save-edit-btn">Save</button>
        <button class="cancel-edit-btn">Cancel</button>
      `;
      textarea.insertAdjacentElement('afterend', editControls);
    
      // Handle save
      const saveHandler = async () => {
        try {
          const response = await fetch(`/api/posts/${postId}?userId=${window.appData.currentUser.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: textarea.value })
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to update post');
          }

          const updatedPost = await response.json();
          contentElement.textContent = updatedPost.content;
          textarea.replaceWith(contentElement);
          editControls.remove();
        } catch (error) {
          console.error('Error updating post:', error);
          alert(error.message || 'Failed to update post');
        }
      };

      // Handle cancel
      const cancelHandler = () => {
        textarea.replaceWith(contentElement);
        editControls.remove();
      };

      // Attach event listeners
      editControls.querySelector('.save-edit-btn').addEventListener('click', saveHandler);
      editControls.querySelector('.cancel-edit-btn').addEventListener('click', cancelHandler);
    }
  });

  function createPostElement(postData) {
    const parser = new DOMParser();
    
    const media = postData.media || {};
    const mediaType = media.type?.toLowerCase();
    const mediaUrl = media.url || '';
    const validMedia = mediaType && mediaUrl && 
                     ['image', 'video', 'audio'].includes(mediaType);
  
    const mediaHTML = validMedia ? `
      <div class="media-container">
        ${mediaType === 'image' ? 
          `<img src="${mediaUrl}" alt="Post media" 
               onerror="this.style.display='none'">` :
          mediaType === 'video' ?
          `<video controls>
            <source src="${mediaUrl}" type="video/mp4">
            Your browser does not support videos
           </video>` :
          `<audio controls>
            <source src="${mediaUrl}" type="audio/mpeg">
            Your browser does not support audio
           </audio>`
        }
      </div>
    ` : '';
  
    const content = postData.content ? 
      postData.content.replace(/</g, '&lt;').replace(/>/g, '&gt;') : '';
    const isAuthor = postData.AuthorID === window.appData?.currentUser?.id;
    const editDeleteButtons = isAuthor ? `
      <div class="post-actions">
        <button class="edit-post-btn" data-post-id="${postData.id}">
          <i class="fa-solid fa-pencil"></i>
        </button>
        <button class="delete-post-btn" data-post-id="${postData.id}">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>
    ` : '';

    const isSaved = postData.isSaved || false;
    const saveButtonHTML = `
    <button class="save-post-btn" data-post-id="${postData.id}">
      <i class="${isSaved ? 'fa-solid' : 'fa-regular'} fa-bookmark"></i>
      <span>${isSaved ? 'Saved' : 'Save'}</span>
    </button>
  `;
  
    const htmlString = `
      <section class="user-post" data-post-id="${postData.id}">        
        <div class="main-container">
          ${editDeleteButtons}
          <div class="post-profile-picture-container">
            <img src="/assets/${postData.author?.profilePicture || 'default-profile.png'}" 
                 alt="Profile Picture">
            <div class="display-name">
              <a href="/profiles/?id=${postData.AuthorID}">
                ${postData.author?.displayName || postData.author?.username || 'Anonymous'}
              </a>
            </div>
          </div>
  
          <div class="post-container">
            ${content ? `<div class="post-text">${content}</div>` : ''}
            ${mediaHTML}
  
            <!-- Add interactive elements -->
            <div class="buttons-container">
              <button class="like-btn" data-post-id="${postData.id}">
                <i class="fa-solid fa-thumbs-up"></i>
                <span>Like</span>
                <span class="like-count">${postData.likes?.length || 0}</span>
              </button>
              <button class="comment-toggle-btn">
                <i class="fa-solid fa-comment"></i>
                <span>Comment</span>
              </button>
              ${saveButtonHTML}
            </div>
  
            <!-- Add comments container -->
            <div class="comments-container" id="comments-${postData.id}">
              ${postData.comments?.length > 0 ? '' : '<p>Be the first one to comment!</p>'}
            </div>
  
            <!-- Add comment input -->
            <div class="comment-input-container" data-post-id="${postData.id}">
              <img src="/assets/${window.appData?.currentUser?.profilePicture || 'default-profile.png'}" 
                   alt="Profile Picture">
              <input type="text" class="comment-input" placeholder="Write a comment...">
              <button class="comment-media-btn" aria-label="Add media">
                <i class="fa-solid fa-image"></i>
              </button>
              <button class="comment-submit-btn">
                <i class="fa-solid fa-paper-plane"></i>
              </button>
            </div>
          </div>
        </div>
      </section>
    `;
    return parser.parseFromString(htmlString, 'text/html').body.firstChild;
  }
});