// API Configuration
const API_BASE_URL = 'https://ws-public.interpol.int/notices/v1/red';
const RESULTS_PER_PAGE = 50;

// State
let state = {
    currentPage: 1,
    totalPages: 1,
    totalRecords: 0,
    notices: [],
    isLoading: false
};

// DOM Elements
const elements = {
    grid: document.getElementById('notices-grid'),
    loader: document.getElementById('loader'),
    prevBtn: document.getElementById('prev-btn'),
    nextBtn: document.getElementById('next-btn'),
    pageIndicators: document.getElementById('page-indicators'),
    currentPageText: document.getElementById('current-page-text'),
    totalPagesText: document.getElementById('total-pages-text'),
    totalRecordsText: document.getElementById('total-records-text')
};

// Initialize App
async function init() {
    setupEventListeners();
    await fetchNotices(state.currentPage);
}

// Fetch Data from Interpol API
async function fetchNotices(page) {
    if (state.isLoading) return;
    
    state.isLoading = true;
    updateUIState();

    try {
        const response = await fetch(`${API_BASE_URL}?resultPerPage=${RESULTS_PER_PAGE}&page=${page}`);
        
        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Update State
        state.notices = data._embedded ? data._embedded.notices : [];
        state.totalRecords = data.total;
        
        // Calculate total pages safely
        const maxPagesAvailable = Math.ceil(state.totalRecords / RESULTS_PER_PAGE);
        // Sometimes API limits how far we can paginate, let's limit to calculated
        state.totalPages = Math.min(maxPagesAvailable, 160); // Optional cap if API has limits
        state.currentPage = page;
        
        renderNotices();
        updatePaginationUI();
        
    } catch (error) {
        console.error('Failed to fetch notices:', error);
        elements.grid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; background: var(--surface-color); border-radius: 12px; border: 1px solid var(--primary-color);">
                <h3>Connection Error</h3>
                <p style="color: var(--text-secondary); margin-top: 1rem;">Could not load data from Interpol API. This could be due to CORS restrictions or API rate limits.</p>
                <button onclick="fetchNotices(${page})" class="btn primary-btn" style="margin: 1.5rem auto 0;">Try Again</button>
            </div>
        `;
    } finally {
        state.isLoading = false;
        updateUIState();
    }
}

// Render the grid of cards
function renderNotices() {
    if (!state.notices || state.notices.length === 0) {
        elements.grid.innerHTML = '<p style="grid-column: 1/-1; text-align:center; color: var(--text-secondary);">No records found for this page.</p>';
        return;
    }

    elements.grid.innerHTML = state.notices.map(notice => {
        // Safe extractions
        const name = notice.name ? notice.name.toUpperCase() : 'UNKNOWN';
        const forename = notice.forename ? notice.forename : '';
        const fullName = `${forename} ${name}`.trim();
        
        // Handle Thumbnail
        let imageUrl = '';
        if (notice._links && notice._links.thumbnail && notice._links.thumbnail.href) {
            imageUrl = notice._links.thumbnail.href;
            // Ensure full URL if relative
            if (!imageUrl.startsWith('http')) {
               // Usually the API returns a full URL, but just in case:
               imageUrl = 'https://ws-public.interpol.int' + (imageUrl.startsWith('/') ? '' : '/') + imageUrl;
            }
        }

        const imageHTML = imageUrl 
            ? `<img src="${imageUrl}" alt="${fullName}" loading="lazy" onerror="this.outerHTML='<div class=\\'photo-placeholder\\'>Image Unavailable</div>'">`
            : `<div class="photo-placeholder">No Photo</div>`;

        // Handle Nationality
        let nationalityHTML = 'Unknown';
        if (notice.nationalities && notice.nationalities.length > 0) {
            nationalityHTML = notice.nationalities.map(nat => {
                const flagEmoji = getFlagEmoji(nat) || '';
                return `<span>${flagEmoji} ${nat}</span>`;
            }).join(', ');
        }

        return `
            <article class="notice-card">
                <div class="notice-badge">WANTED</div>
                <div class="card-image">
                    ${imageHTML}
                </div>
                <div class="card-content">
                    <h2 class="card-title">${fullName}</h2>
                    
                    <div class="card-info">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/></svg>
                        ${nationalityHTML}
                    </div>
                    
                    ${notice.date_of_birth ? `
                    <div class="card-info" style="margin-top: 0.5rem;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
                        Born: ${notice.date_of_birth}
                    </div>
                    ` : ''}
                </div>
            </article>
        `;
    }).join('');
}

// Convert Country Code to Emoji Flag (e.g., 'US' -> 🇺🇸)
function getFlagEmoji(countryCode) {
    if (!countryCode || countryCode.length !== 2) return null;
    const codePoints = countryCode
        .toUpperCase()
        .split('')
        .map(char => 127397 + char.charCodeAt());
    return String.fromCodePoint(...codePoints);
}

// Update UI Loading State
function updateUIState() {
    if (state.isLoading) {
        elements.loader.classList.remove('hidden');
        elements.grid.style.display = 'none';
    } else {
        elements.loader.classList.add('hidden');
        elements.grid.style.display = 'grid';
    }
}

// Update Pagination UI
function updatePaginationUI() {
    elements.currentPageText.textContent = state.currentPage;
    elements.totalPagesText.textContent = state.totalPages;
    elements.totalRecordsText.textContent = state.totalRecords.toLocaleString();

    // Button states
    elements.prevBtn.disabled = state.currentPage === 1 || state.isLoading;
    elements.nextBtn.disabled = state.currentPage === state.totalPages || state.isLoading;

    // Render page dots
    renderPageIndicators();
}

function renderPageIndicators() {
    let indicatorsHTML = '';
    
    // Create a sliding window of max 5 pages
    let startPage = Math.max(1, state.currentPage - 2);
    let endPage = Math.min(state.totalPages, startPage + 4);
    
    // Adjust start if we hit the end
    if (endPage - startPage < 4) {
        startPage = Math.max(1, endPage - 4);
    }

    for (let i = startPage; i <= endPage; i++) {
        const isActive = i === state.currentPage ? 'active' : '';
        indicatorsHTML += `<div class="page-dot ${isActive}" onclick="goToPage(${i})">${i}</div>`;
    }

    elements.pageIndicators.innerHTML = indicatorsHTML;
}

// Event Listeners
function setupEventListeners() {
    elements.prevBtn.addEventListener('click', () => {
        if (state.currentPage > 1) {
            goToPage(state.currentPage - 1);
        }
    });

    elements.nextBtn.addEventListener('click', () => {
        if (state.currentPage < state.totalPages) {
            goToPage(state.currentPage + 1);
        }
    });
}

// Navigate to specific page
function goToPage(pageNumber) {
    if (pageNumber === state.currentPage || state.isLoading) return;
    
    // Scroll to top smoothly
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    fetchNotices(pageNumber);
}

// Start application
document.addEventListener('DOMContentLoaded', init);
