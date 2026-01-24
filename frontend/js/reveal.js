// =====================================================
// MY VAL - Reveal Page Logic
// Uses server-provided match data from /match/status
// =====================================================

const API_BASE = "https://myval-api.onrender.com";

document.addEventListener('DOMContentLoaded', async function () {
    const container = document.getElementById('reveal-content');

    try {
        // Check authentication
        const authUser = await Auth.requireAuth();

        // Show loading
        showLoading(container);

        // Fetch match status from backend
        const status = await fetchMatchStatus(authUser);

        if (!status) {
            // API failed - fallback to local database
            console.warn("API failed, using local fallback");
            await handleLocalFallback(authUser, container);
            return;
        }

        // Handle based on status
        handleMatchStatus(status, container, authUser);

    } catch (error) {
        console.error('Reveal page error:', error);
        showError(container);
    }

    // Logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function () {
            Auth.logout();
        });
    }
});

// Fetch match status from backend API
async function fetchMatchStatus(authUser) {
    try {
        const token = await authUser.getIdToken(true);

        const response = await fetch(`${API_BASE}/match/status`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });

        if (!response.ok) {
            console.error("Status API error:", response.status);
            return null;
        }

        const data = await response.json();
        return data.success ? data : null;
    } catch (e) {
        console.error("Failed to fetch match status:", e);
        return null;
    }
}

// Handle the match status response
function handleMatchStatus(status, container, authUser) {
    // Not paid? Redirect to payment
    if (!status.isPaid) {
        window.location.href = 'payment.html';
        return;
    }

    // No match yet?
    if (!status.hasMatch) {
        showNoMatch(container);
        return;
    }

    // Not reveal time yet?
    if (!status.isRevealTime) {
        showNotYet(container, status.revealAt);
        return;
    }

    // Has match and reveal time reached - show match!
    if (status.matchData) {
        showMatch(container, status.matchData);

        // Mark as revealed in database if not already
        if (!status.matchRevealed) {
            markAsRevealed(authUser);
        }
    } else {
        // Match exists but data not loaded - show limited info
        showMatchPending(container);
    }
}

// Fallback to local database if API fails
async function handleLocalFallback(authUser, container) {
    const userData = await Database.getUser(authUser.uid);

    if (!userData || userData.paymentStatus !== 'paid') {
        window.location.href = 'payment.html';
        return;
    }

    if (!Database.isRevealDate()) {
        showNotYet(container);
        return;
    }

    if (!userData.matchId) {
        showNoMatch(container);
        return;
    }

    const matchData = await Database.getMatch(userData.matchId);

    if (!matchData) {
        showNoMatch(container);
        return;
    }

    showMatch(container, matchData);
}

// Mark match as revealed via API
async function markAsRevealed(authUser) {
    try {
        const token = await authUser.getIdToken(true);

        await fetch(`${API_BASE}/match/reveal`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        console.log('✅ Match marked as revealed');
    } catch (e) {
        console.warn('Could not mark as revealed:', e);
    }
}

function showLoading(container) {
    if (!container) return;
    container.innerHTML = `
        <div class="no-match">
            <div class="no-match-icon">⏳</div>
            <h2 class="no-match-title">Loading...</h2>
            <p class="no-match-message">Checking your match status...</p>
        </div>
    `;
}

function showNotYet(container, revealAt) {
    if (!container) return;
    const revealDate = revealAt ? new Date(revealAt).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
    }) : 'February 10th, 2026';

    container.innerHTML = `
        <div class="no-match">
            <div class="no-match-icon">🔒</div>
            <h2 class="no-match-title">Not Yet!</h2>
            <p class="no-match-message">
                Your match will be revealed on <strong>${revealDate}</strong>.<br>
                Please wait until the reveal date!
            </p>
            <a href="waiting.html" class="btn btn-primary mt-xl">
                View Countdown
            </a>
        </div>
    `;
}

function showNoMatch(container) {
    if (!container) return;
    container.innerHTML = `
        <div class="no-match">
            <div class="no-match-icon">😔</div>
            <h2 class="no-match-title">No Match Found</h2>
            <p class="no-match-message">
                Unfortunately, we couldn't find a compatible match for you this time.<br>
                This could be due to limited users in your area with matching preferences.
            </p>
            <a href="dashboard.html" class="btn btn-secondary mt-xl">
                Back to Dashboard
            </a>
        </div>
    `;
}

function showMatchPending(container) {
    if (!container) return;
    container.innerHTML = `
        <div class="no-match">
            <div class="no-match-icon">⏳</div>
            <h2 class="no-match-title">Match Ready!</h2>
            <p class="no-match-message">
                Your match is ready! Please refresh the page to see their details.
            </p>
            <button onclick="location.reload()" class="btn btn-primary mt-xl">
                Refresh
            </button>
        </div>
    `;
}

function showError(container) {
    if (!container) return;
    container.innerHTML = `
        <div class="no-match">
            <div class="no-match-icon">⚠️</div>
            <h2 class="no-match-title">Something Went Wrong</h2>
            <p class="no-match-message">Please try again later.</p>
            <a href="dashboard.html" class="btn btn-secondary mt-xl">
                Back to Dashboard
            </a>
        </div>
    `;
}

function showMatch(container, match) {
    if (!container) return;

    const genderEmoji = match.gender === 'female' ? '👩' : match.gender === 'male' ? '👨' : '🧑';

    container.innerHTML = `
        <div class="reveal-header">
            <div class="reveal-confetti">🎉💗🎉</div>
            <h1 class="reveal-title">Your Match Is Here!</h1>
            <p class="text-muted">Happy Valentine's Season!</p>
        </div>
        
        <div class="match-card card card-glass">
            <div class="match-avatar">
                ${genderEmoji}
            </div>
            
            <h2 class="match-name">${match.fullName || 'Your Match'}</h2>
            
            <div class="match-details">
                <div class="match-detail">
                    <span class="match-detail-icon">📍</span>
                    <span class="match-detail-value">${match.city || ''}</span>
                </div>
            </div>
            
            <div class="match-phone">
                📱 ${match.phoneNumber || match.phone || 'N/A'}
            </div>
            
            <p class="match-note">
                Reach out to your Valentine via phone or text!<br>
                Be respectful and have a wonderful Valentine's Day! 💕
            </p>
        </div>
        
        <a href="dashboard.html" class="btn btn-secondary mt-xl">
            ← Back to Dashboard
        </a>
    `;
}
