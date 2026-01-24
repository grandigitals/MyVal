// =====================================================
// MY VAL - Waiting Page Logic
// Uses server-provided reveal time from /match/status
// =====================================================

const API_BASE = "https://myval-api.onrender.com";

document.addEventListener('DOMContentLoaded', async function () {
    // Require authentication
    try {
        const authUser = await Auth.requireAuth();

        // Show loading state
        updateMessage("Loading your match status...");

        // Fetch match status from backend
        const status = await fetchMatchStatus(authUser);

        if (status) {
            handleMatchStatus(status);
        } else {
            // Fallback to local config if API fails
            console.warn("Failed to fetch status, using local config");
            startCountdownWithDate(CONFIG.REVEAL_DATE);
        }

    } catch (error) {
        console.error('Auth required:', error);
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

        if (data.success) {
            return data;
        }

        return null;
    } catch (e) {
        console.error("Failed to fetch match status:", e);
        return null;
    }
}

// Handle the match status response
function handleMatchStatus(status) {
    const msgEl = document.getElementById('match-message');

    // Not paid? Redirect to payment
    if (!status.isPaid) {
        window.location.href = 'payment.html';
        return;
    }

    // Already reveal time? Redirect to reveal page
    if (status.isRevealTime && status.hasMatch) {
        window.location.href = 'reveal.html';
        return;
    }

    // Update message based on match status
    if (status.hasMatch) {
        updateMessage('Your match has been found! 🎉<br>Hold tight until the big reveal.');
    } else {
        updateMessage('Thank you for your patience.<br>We\'re finding you the perfect match!');
    }

    // Get reveal time (from user data or server default)
    let revealAtMs = status.revealAtMs;
    if (!revealAtMs && status.serverConfig) {
        revealAtMs = status.serverConfig.defaultRevealAtMs;
    }

    if (revealAtMs) {
        const revealDate = new Date(revealAtMs);
        startCountdownWithDate(revealDate);

        // Show test mode indicator if in test mode
        if (status.testMode || status.serverConfig?.testMode) {
            console.log("🧪 TEST MODE active - reveal in 2 minutes");
        }
    } else {
        // Fallback to local config
        startCountdownWithDate(CONFIG.REVEAL_DATE);
    }
}

// Update the message display
function updateMessage(html) {
    const msgEl = document.getElementById('match-message');
    if (msgEl) {
        msgEl.innerHTML = html;
    }
}

// Start countdown to a specific date
function startCountdownWithDate(revealDate) {
    function updateCountdown() {
        const now = new Date();
        const diff = revealDate - now;

        if (diff <= 0) {
            // Reveal date arrived!
            document.getElementById('days').textContent = '00';
            document.getElementById('hours').textContent = '00';
            document.getElementById('minutes').textContent = '00';
            document.getElementById('seconds').textContent = '00';

            // Show reveal message
            updateMessage('🎉 It\'s reveal time! <a href="reveal.html" class="text-pink">Click here to see your match!</a>');
            return;
        }

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        document.getElementById('days').textContent = String(days).padStart(2, '0');
        document.getElementById('hours').textContent = String(hours).padStart(2, '0');
        document.getElementById('minutes').textContent = String(minutes).padStart(2, '0');
        document.getElementById('seconds').textContent = String(seconds).padStart(2, '0');
    }

    updateCountdown();
    setInterval(updateCountdown, 1000);
}
