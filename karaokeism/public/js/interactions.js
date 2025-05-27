function toggleReplies(button) {
  const container = button.previousElementSibling;
  container.classList.toggle('visible');
  
  const totalReplies = container.querySelectorAll('.comment').length;
  
  button.textContent = container.classList.contains('visible') 
    ? 'Show fewer replies' 
    : `Show ${totalReplies - 2} more replies`;
}

function updateRepliesToggle(parentComment) {
  const repliesContainer = parentComment.querySelector('.replies-container');
  if (!repliesContainer) return;

  const totalReplies = repliesContainer.querySelectorAll('.comment').length;

  const old = parentComment.querySelector('.show-replies-link');
  if (old) old.remove();

  if (totalReplies > 2) {
    const link = document.createElement('a');
    link.href = '#';
    link.className = 'show-replies-link';
    link.textContent = repliesContainer.classList.contains('visible')
      ? 'Show fewer replies'
      : `Show ${totalReplies - 2} more replies`;
    link.addEventListener('click', e => {
      e.preventDefault();
      toggleReplies(link);
    });

    repliesContainer.parentNode.insertBefore(link, repliesContainer.nextSibling);
  }
}


window.toggleReplies = toggleReplies;

document.addEventListener('DOMContentLoaded', () => {
  let currentCommentMedia = null;
  let currentCommentMediaPreview = null;

  function handleCommentMediaClick(e) {
    e.preventDefault();
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,video/*,audio/*';
    input.style.display = 'none';
    
    input.onchange = (event) => {
      const file = event.target.files[0];
      if (!file) return;

      const button = e.target.closest('.comment-media-btn') || 
                    e.target.closest('.fa-image')?.parentElement;
      if (!button) {
        console.error('Could not find media button');
        return;
      }

      // Add loading state
      button.disabled = true;
      const originalContent = button.innerHTML;
      button.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';

      const reader = new FileReader();
      reader.onload = (loadEvent) => {
        const commentInputContainer = button.closest('.comment-input-container');
        if (!commentInputContainer) {
          console.error('Comment input container not found');
          return;
        }

        currentCommentMedia = {
          file: file,
          type: file.type.startsWith('image') ? 'image' :
                file.type.startsWith('video') ? 'video' : 'audio',
          url: URL.createObjectURL(file)
        };

        // Create or update preview container
        let previewContainer = commentInputContainer.querySelector('.comment-media-preview');
        if (!previewContainer) {
          previewContainer = document.createElement('div');
          previewContainer.className = 'comment-media-preview';
          commentInputContainer.parentNode.insertBefore(
            previewContainer, 
            commentInputContainer.nextSibling
          );
        }

        previewContainer.innerHTML = `
          <div class="media-preview-content">
            ${ currentCommentMedia.type === 'image' ? 
              `<img src="${loadEvent.target.result}" alt="Preview">` :
              currentCommentMedia.type === 'video' ?
              `<video controls src="${loadEvent.target.result}"></video>` :
              `<audio controls src="${loadEvent.target.result}"></audio>` }
          </div>
          <button class="remove-comment-media-btn" aria-label="Remove media">
            <i class="fa-solid fa-xmark"></i>
          </button>
        `;

        currentCommentMediaPreview = previewContainer;
        button.disabled = false;
        button.innerHTML = originalContent;
      };

      reader.onerror = () => {
        console.error('Error reading file');
        button.disabled = false;
        button.innerHTML = originalContent;
      };

      reader.readAsDataURL(file);
    };

    document.body.appendChild(input);
    input.click();
    document.body.removeChild(input);
  }

  // Comment Creation
  function createCommentElement(commentData) {
    const parser = new DOMParser();

    let media = commentData.media || null;
    if (typeof media === 'string') {
      try {
        media = JSON.parse(media);
      } catch (e) {
        console.error('Error parsing media:', e);
        media = null;
      }
    }
    
    const mediaType = media?.type?.toLowerCase() || '';
    const mediaUrl = media?.url || '';
    const validMedia = mediaType && mediaUrl;
  
    const mediaHTML = validMedia ? `
    <div class="media-container">
      ${mediaType === 'image' ?
        `<img src="${mediaUrl}" alt="Comment media">` :
       mediaType === 'video' ?
        `<video controls><source src="${mediaUrl}" type="video/mp4"></video>` :
        `<audio controls><source src="${mediaUrl}" type="audio/mpeg"></audio>`
      }
    </div>
  ` : '';

    const isCommentAuthor = commentData.userId === window.appData?.currentUser?.id;
    const commentActions = isCommentAuthor ? `
      <div class="comment-actions">
        <button class="edit-comment-btn" data-comment-id="${commentData.id}">
          <i class="fa-solid fa-pencil"></i>
        </button>
        <button class="delete-comment-btn" data-comment-id="${commentData.id}">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>
    ` : '';
  
    const profilePic = commentData.author?.profilePicture ?
      `/assets/${commentData.author.profilePicture}` :
      '/assets/default-profile.png';
  
      const htmlString = `
      <div class="comment" data-comment-id="${commentData.id}">
        ${commentActions}
        <img src="${profilePic}" alt="Profile Picture">
        <div class="comment-content">
          <div class="commentor-name">
            <a href="/profiles/?id=${commentData.userId}">
              ${commentData.author?.displayName || commentData.author?.username || 'Anonymous'}
            </a>
          </div>
          ${commentData.content ? `<div class="comment-text">${commentData.content}</div>` : ''}
          ${mediaHTML}
          <div class="comment-bottom">
            <a href="#" class="like-link">Like</a>
            <a href="#" class="reply-link">Reply</a>
            ${commentData.commentLikes?.length > 0
              ? `<span class="comment-like-count">${commentData.commentLikes.length}</span>`
              : ''}
          </div>
            ${commentData.replies?.length > 0 ? `
                <div class="replies-container">
                    ${commentData.replies.map(reply => createCommentElement(reply).outerHTML).join('')}
                </div>
                ${commentData.replies.length > 2 ? `
                ` : ''}
            ` : ''}
        </div>
      </div>
    `;
  
    return parser.parseFromString(htmlString, 'text/html').body.firstChild;
  }

  document.addEventListener('click', async (e) => {
    // Like button functionality
    if (e.target.closest('.like-btn')) {
      const button = e.target.closest('.like-btn');
      const postId = button.dataset.postId;

      try {
        const response = await fetch(`/api/posts/${postId}/like?userId=${window.appData?.currentUser?.id || ''}`, {
          method: 'POST',
          headers: {'Content-Type': 'application/json'}
        });

        const result = await response.json();
        
        if (!response.ok) {
          throw new Error(result.error || 'Failed to like post');
        }

        const likeCountElement = button.querySelector('.like-count');
        if (likeCountElement) {
          likeCountElement.textContent = result.likes; 
        }
        button.classList.toggle('active', result.liked);
      } catch (error) {
        console.error('Error liking post:', error);
        alert(error.message || 'Failed to like post. Please try again.');
      }
    }

    // Comment like functionality
    if (e.target.closest('.like-link')) {
      e.preventDefault();
      const likeLink = e.target.closest('.like-link');
      const commentElement = likeLink.closest('.comment');
      
      if (!commentElement) {
        console.error('Comment element not found');
        return;
      }

      const postElement = commentElement.closest('.user-post');
      if (!postElement) {
        console.error('Post element not found');
        return;
      }

      const postId = postElement.dataset.postId;
      const commentId = commentElement.dataset.commentId;

      try {
        const response = await fetch(`/api/posts/${postId}/comments/${commentId}/like?userId=${window.appData?.currentUser?.id || ''}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            userId: window.appData?.currentUser?.id || '1' 
          })
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to like comment');
        }
        
        likeLink.textContent = result.liked ? 'Liked' : 'Like';
        const likeCountElement = likeLink.nextElementSibling;
        
        if (likeCountElement && likeCountElement.classList.contains('comment-like-count')) {
          likeCountElement.textContent = result.likes;
        } else if (result.likes > 0) {
          const likeCountSpan = document.createElement('span');
          likeCountSpan.className = 'comment-like-count';
          likeCountSpan.textContent = result.likes;
          likeLink.insertAdjacentElement('afterend', likeCountSpan);
        }
      } catch (error) {
        console.error('Error liking comment:', error);
        alert(error.message || 'Failed to like comment. Please try again.');
      }
    }

    // Reply functionality
    if (e.target.closest('.reply-link')) {
      e.preventDefault();
      const replyLink = e.target.closest('.reply-link');
      const commentElement = replyLink.closest('.comment');
      const postElement = commentElement.closest('.user-post');
      const postId = postElement.dataset.postId;
      const parentCommentId = commentElement.dataset.commentId;

      const replyInputContainer = document.createElement('div');
      replyInputContainer.className = 'reply-input-container';
      replyInputContainer.innerHTML = `
      <div class="comment-input-container" 
           data-post-id="${postId}"
           data-parent-comment-id="${parentCommentId}">
        <input type="text" class="comment-input" placeholder="Write a reply...">
        <button class="comment-media-btn"><i class="fa-regular fa-image"></i></button>
        <button class="comment-submit-btn">Reply</button>
      </div>
    `;

      commentElement.insertAdjacentElement('afterend', replyInputContainer);
    }

    // Comment submission
    if (e.target.closest('.comment-submit-btn')) {
      const button = e.target.closest('.comment-submit-btn');
      const container = button.closest('.comment-input-container');

      if (!container) {
        console.error('Comment input container not found');
        return;
      }

      const input = container.querySelector('.comment-input');
      const postId = container.dataset.postId;
      const commentText = input.value.trim();
      const isReply = container.closest('.reply-input-container');
      let parentCommentId = null;

      if (isReply) {
        parentCommentId = container.dataset.parentCommentId;

        const replyContainer = container.closest('.reply-input-container');
        if (!replyContainer) {
          console.error('Reply container not found');
          return;
        }

      const parentCommentElement = replyContainer.previousElementSibling;
      if (!parentCommentElement || !parentCommentElement.classList.contains('comment')) {
        console.error('Parent comment element not found');
      }

      parentCommentId = parentCommentElement.dataset.commentId;
    }

      if (commentText || currentCommentMedia) {
        try {
          const formData = new FormData();
          formData.append('text', commentText);
          if (currentCommentMedia) formData.append('media', currentCommentMedia.file);

          const endpoint = isReply ? 
            `/api/posts/${postId}/comments/${parentCommentId}/reply` : 
            `/api/posts/${postId}/comments`;

          const response = await fetch(`${endpoint}?userId=${window.appData?.currentUser?.id || ''}`, {
            method: 'POST',
            body: formData
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to add comment');
          }

          const result = await response.json();
          const commentsContainer = document.getElementById(`comments-${postId}`);

          if (commentsContainer) {
            const commentElement = createCommentElement(result);
            
            if (isReply) {
              const parentComment = document.querySelector(`.comment[data-comment-id="${parentCommentId}"]`);
              if (!parentComment) {
                throw new Error('Parent comment not found in DOM');
              }
              const repliesContainer = parentComment.querySelector('.replies-container') 
              || createRepliesContainer(parentComment);
            
              repliesContainer.appendChild(commentElement);
              updateRepliesToggle(parentComment);

              container.closest('.reply-input-container').remove();
            } else {
              const commentsContainer = document.getElementById(`comments-${postId}`);
              commentsContainer.appendChild(commentElement);
              const noComments = commentsContainer.querySelector('p');
              if (noComments?.textContent.includes('Be the first one to comment!')) {
                commentsContainer.removeChild(noComments);
              }
              updateRepliesToggle(commentElement);
            }

            input.value = '';
            if (currentCommentMediaPreview) currentCommentMediaPreview.remove();
            currentCommentMedia = null;
            currentCommentMediaPreview = null;
          }
        } catch (error) {
          console.error('Error adding comment:', error);
          alert(error.message || 'Failed to add comment. Please try again.');
        }
      }
    }

    // Media handling
    if (e.target.closest('.comment-media-btn') || e.target.classList.contains('fa-image')) {
      handleCommentMediaClick(e);
    }

    // Media removal
    if (e.target.closest('.remove-comment-media-btn')) {
      e.preventDefault();
      const previewContainer = e.target.closest('.comment-media-preview');
      if (previewContainer) {
        previewContainer.remove();
        currentCommentMedia = null;
        currentCommentMediaPreview = null;
      }
    }
  });

  function createRepliesContainer(parentElement) {
    const repliesContainer = document.createElement('div');
    repliesContainer.className = 'replies-container';
    parentElement.querySelector('.comment-content').appendChild(repliesContainer);
    return repliesContainer;
  }

  document.addEventListener('click', async (e) => {
    // Delete comment
    if (e.target.closest('.delete-comment-btn')) {
      const button = e.target.closest('.delete-comment-btn');
      const commentId = button.dataset.commentId;
      const commentElement = button.closest('.comment');
      const postElement = commentElement.closest('.user-post');
      const postId = postElement.dataset.postId;
  
      // Show confirmation modal
      const modal = document.getElementById('confirmationModal');
      const modalTitle = document.getElementById('modalTitle');
      const modalMessage = document.getElementById('modalMessage');
      const modalConfirm = document.getElementById('modalConfirm');
      const modalCancel = document.getElementById('modalCancel');
  
      // Update modal content
      modalTitle.textContent = 'Delete Comment';
      modalMessage.textContent = 'Are you sure you want to delete this comment?';
      modal.classList.add('show');
  
      // Handle modal actions
      const handleModal = async (confirmed) => {
        if (confirmed) {
          try {
            const response = await fetch(`/api/posts/${postId}/comments/${commentId}?userId=${window.appData?.currentUser?.id || ''}`, {
              method: 'DELETE'
            });
  
            if (!response.ok) {
              const error = await response.json();
              throw new Error(error.message || 'Failed to delete comment');
            }
  
            commentElement.remove();
          } catch (error) {
            console.error('Error deleting comment:', error);
            alert(error.message || 'Failed to delete comment');
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

    // Edit comment
    if (e.target.closest('.edit-comment-btn')) {
      const commentElement = e.target.closest('.comment');
      const commentId = commentElement.dataset.commentId;
      const postElement = commentElement.closest('.user-post');
      const postId = postElement.dataset.postId;

      const contentElement = commentElement.querySelector('.comment-text');
      
      // Enter edit mode
      const originalContent = contentElement.textContent;
      const textarea = document.createElement('textarea');
      textarea.className = 'edit-comment-input';
      textarea.value = originalContent;
      contentElement.replaceWith(textarea);

      // Create edit controls
      const editControlsHTML = `
        <div class="edit-controls">
          <button class="save-edit-btn">Save</button>
          <button class="cancel-edit-btn">Cancel</button>
        </div>
      `;
      textarea.insertAdjacentHTML('afterend', editControlsHTML);
      const editControls = textarea.nextElementSibling;

      const saveBtn = editControls.querySelector('.save-edit-btn');
      const cancelBtn = editControls.querySelector('.cancel-edit-btn');

      // Handle save/cancel
      const handleSave = async () => {
        try {
          const response = await fetch(`/api/posts/${postId}/comments/${commentId}?userId=${window.appData?.currentUser?.id || ''}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: textarea.value })
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to update comment');
          }

          const updatedComment = await response.json();
          contentElement.textContent = updatedComment.content;
          textarea.replaceWith(contentElement);
          editControls.remove();
        } catch (error) {
          console.error('Error updating comment:', error);
          alert(error.message || 'Failed to update comment');
        }
      };

      const handleCancel = () => {
        textarea.replaceWith(contentElement);
        editControls.remove();
      };

      saveBtn.addEventListener('click', handleSave);
      cancelBtn.addEventListener('click', handleCancel);
    }
  });


});