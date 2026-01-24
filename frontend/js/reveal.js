// =====================================================
// MY VAL - Reveal Page Logic
// Only works after February 10th reveal date
// =====================================================

document.addEventListener('DOMContentLoaded', async function () {
    const container = document.getElementById('reveal-content');

    try {
        // Check authentication
        const authUser = await Auth.requireAuth();
        const userData = await Database.getUser(authUser.uid);

        // If not paid, redirect to payment
        if (!userData || userData.paymentStatus !== 'paid') {
            window.location.href = 'payment.html';
            return;
        }

        // *** KEY CHECK: Is it reveal date yet? ***
        if (!Database.isRevealDate()) {
            showNotYet(container);
            return;
        }

        // Check if user has a match
        if (!userData.matchId) {
            showNoMatch(container);
            return;
        }

        // Get match data
        const matchData = await Database.getMatch(userData.matchId);

        if (!matchData) {
            showNoMatch(container);
            return;
        }

        // Show the match!
        showMatch(container, matchData);

        // Mark as revealed in database
        if (!userData.matchRevealed) {
            try {
                await Database.updateUser(authUser.uid, { matchRevealed: true });
                console.log('✅ Match marked as revealed');
            } catch (e) {
                console.warn('Could not mark as revealed:', e);
            }
        }

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

function showNotYet(container) {
    if (!container) return;
    container.innerHTML = `
        <div class="no-match">
            <div class="no-match-icon">🔒</div>
            <h2 class="no-match-title">Not Yet!</h2>
            <p class="no-match-message">
                Your match will be revealed on <strong>February 10th, 2026</strong>.<br>
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
