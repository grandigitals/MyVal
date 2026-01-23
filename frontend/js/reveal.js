// =====================================================
// MY VAL - Reveal Page Logic
// =====================================================

document.addEventListener('DOMContentLoaded', async function () {
    // Require authentication
    try {
        const authUser = await Auth.requireAuth();
        const userData = await Database.getUser(authUser.uid);

        // If not paid, redirect to payment
        if (!userData || userData.paymentStatus !== 'paid') {
            window.location.href = 'payment.html';
            return;
        }

        // Check if reveal date
        if (!Database.isRevealDate()) {
            // Not reveal time yet
            showNotYet();
            return;
        }

        // Check if has match
        if (!userData.matchId) {
            showNoMatch();
            return;
        }

        // Get match data
        const matchData = await Database.getMatch(userData.matchId);

        if (!matchData) {
            showNoMatch();
            return;
        }

        // Show match!
        showMatch(matchData);

        // Mark as revealed (so we know user has seen their match)
        if (!userData.matchRevealed) {
            await Database.updateUser(authUser.uid, { matchRevealed: true });
            console.log('✅ Match marked as revealed');
        }

    } catch (error) {
        console.error('Auth required');
    }

    // Logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function () {
            Auth.logout();
        });
    }
});

function showNotYet() {
    const container = document.getElementById('reveal-content');
    container.innerHTML = `
        <div class="no-match">
            <div class="no-match-icon">🔒</div>
            <h2 class="no-match-title">Not Yet!</h2>
            <p class="no-match-message">Your match will be revealed on February 10th, 2026.</p>
            <a href="waiting.html" class="btn btn-primary mt-xl">
                View Countdown
            </a>
        </div>
    `;
}

function showNoMatch() {
    const container = document.getElementById('reveal-content');
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

function showMatch(match) {
    const genderEmoji = match.gender === 'female' ? '👩' : match.gender === 'male' ? '👨' : '🧑';

    const container = document.getElementById('reveal-content');
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
            
            <h2 class="match-name">${match.fullName}</h2>
            
            <div class="match-details">
                <div class="match-detail">
                    <span class="match-detail-icon">📍</span>
                    <span class="match-detail-value">${match.city}</span>
                </div>
            </div>
            
            <div class="match-phone">
                📱 ${match.phoneNumber}
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
