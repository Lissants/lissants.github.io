document.addEventListener('DOMContentLoaded', () => {
  const updateURL = (query) => {
    if (history.replaceState) {
      const url = query ? `/search?q=${encodeURIComponent(query)}` : '/search';
      window.history.replaceState({ path: url }, '', url);
    }
  };
  // DOM Elements
  const searchInput = document.querySelector('.search-bar');
  const searchForm = document.querySelector('form[action="/search"]');
  const searchResultsContainer = document.querySelector('.search-results');
  const recentSearchesContainer = document.getElementById('recent-searches-list');
  const filterRadios = document.querySelectorAll('input[name="filter"]');
  const mediaCheckbox = document.querySelector('input[name="hasMedia"]');
  let abortController = new AbortController();
  const handleInitialSearch = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const query = urlParams.get('q');
    
    if (query) {
      searchInput.value = query;
      handleSearchInput(query);
    }
  };

  if (!searchInput || !searchForm || !searchResultsContainer) {
    console.error('Essential search elements missing from DOM');
    return;
  }

  // Configuration
  const DEBOUNCE_DELAY = 300;
  const MAX_RECENT_SEARCHES = 3;
  const MAX_RESULT_PREVIEW = 100;

  // State
  let currentSearchQuery = '';

  // Recent Searches Management
  const getRecentSearches = () => {
    try {
      return JSON.parse(localStorage.getItem('recentSearches')) || [];
    } catch (error) {
      console.error('Error parsing recent searches:', error);
      return [];
    }
  };

  const saveRecentSearch = (query) => {
    if (!query.trim()) return;
    const searches = getRecentSearches()
      .filter(s => s.toLowerCase() !== query.toLowerCase())
      .slice(0, MAX_RECENT_SEARCHES - 1);
    localStorage.setItem('recentSearches', JSON.stringify([query, ...searches]));
    displayRecentSearches();
  };

  const displayRecentSearches = () => {
    if (!recentSearchesContainer) return;
    
    try {
      const searches = getRecentSearches();
      recentSearchesContainer.innerHTML = searches.slice(0, 3).map(search => `
        <button class="recent-search-btn" data-query="${search}"> <!-- Add data-query -->
          ${search.length > 20 ? `${search.substring(0, 20)}...` : search}
        </button>
      `).join('');
    } catch (error) {
      console.error('Error displaying recent searches:', error);
    }
  };

  // Search Execution
  const executeSearch = async (query) => {
    try {
      const params = new URLSearchParams({
        q: query,
        filter: document.querySelector('input[name="filter"]:checked')?.value || 'all',
        hasMedia: mediaCheckbox.checked ? 'true' : 'false',
        _: Date.now()
      });
  
      const response = await fetch(`/api/search?${params}`);
      if (!response.ok) {
        console.error('API Error:', await response.text());
        return { results: [], error: true };
      }
      return await response.json();
    } catch (error) {
      console.error('Search error:', error);
      return { results: [], error: true };
    }
  };

  // Result Display
  const displayResults = (results, query) => {
    console.log('Displaying results:', results);
    searchResultsContainer.innerHTML = '';
    currentSearchQuery = query;

    if (!results || results.error) {
      searchResultsContainer.innerHTML = `<div class="error">Error loading results</div>`;
      return;
    }

    if (results.length === 0) {
      searchResultsContainer.innerHTML = `
        <div class="no-results">
          No results for "${query}"
          ${query.length < 3 ? '<div class="tip">Try longer keywords</div>' : ''}
        </div>`;
      return;
    }

    const container = document.createElement('div');
    container.innerHTML = `<h3>Results for "${query}"</h3>`;
    
    const fragment = document.createDocumentFragment();
    
    results.forEach(result => {
      const element = document.createElement('div');
      element.className = `search-result ${result.type}`;

      if (result.type === 'profile') {
        element.innerHTML = `
          <div class="profile-result">
            <a href="/profiles?id=${result.id}" class="profile-link">
              <img src="/assets/${result.profilePicture}" 
                  alt="${result.displayName}'s profile picture"
                  class="profile-image">
              <div class="profile-info">
                <h3>${result.displayName || result.username}</h3>
              </div>
            </a>
          </div>`;
      } else {
        element.innerHTML = `
          <div class="post-result">
            <a href="/posts?id=${result.id}" class="post-link">
              <div class="author-info">
                <img src="/assets/${result.author.profilePicture}" 
                    alt="${result.author.displayName}'s profile picture">
                <span>${result.author.displayName}</span>
              </div>
              <div class="post-preview">
                <p>${result.content.substring(0, MAX_RESULT_PREVIEW)}...</p>
                ${result.media ? `
                  <div class="media-indicator">
                    <i class="fa-solid fa-file-image"></i>
                    Contains Media
                  </div>` : ''}
              </div>
            </a>
          </div>`;
      }

      fragment.appendChild(element);
    });

    container.appendChild(fragment);
    searchResultsContainer.appendChild(container);
  };

  const handleSearchInput = debounce(async (query) => {
    console.log('Searching for:', query);
    const response = await executeSearch(query);
    console.log('API response:', response);
    displayResults(response.results, query);
  }, DEBOUNCE_DELAY);

  const handleFormSubmit = (e) => {
    e.preventDefault();
    const query = searchInput.value.trim();
    if (query) {
      saveRecentSearch(query);
      handleSearchInput(query);
      return false;
    }
  };

  const handleRecentSearchClick = (e) => {
    if (e.target.closest('.recent-search-btn')) {
      const query = e.target.dataset.query;
      searchInput.value = query;
      handleSearchInput(query);
    }
  };

  const handleFilterChange = () => {
    if (currentSearchQuery) {
      handleSearchInput(currentSearchQuery);
    }
  };

  const init = () => {
    displayRecentSearches();
    handleInitialSearch();
    
    searchInput.addEventListener('input', (e) => 
      handleSearchInput(e.target.value.trim()));
    searchForm.addEventListener('submit', handleFormSubmit);
    recentSearchesContainer.addEventListener('click', handleRecentSearchClick);
    filterRadios.forEach(radio => 
      radio.addEventListener('change', handleFilterChange));
    mediaCheckbox.addEventListener('change', handleFilterChange);
  };

  init();
});

function debounce(func, timeout = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => func.apply(this, args), timeout);
  };
}