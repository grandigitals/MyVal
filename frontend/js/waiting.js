// =====================================================
// MY VAL - Waiting Page Logic
// Shows countdown to February 10th reveal date
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

        // Check if reveal date has passed AND user has a match
        if (Database.isRevealDate() && userData.matchId) {
            window.location.href = 'reveal.html';
            return;
        }

        // Update message based on match status
        const msgEl = document.getElementById('match-message');
        if (msgEl) {
            if (userData.matchId) {
                msgEl.innerHTML = 'Your match has been found! 🎉<br>Hold tight until the big reveal.';
            } else {
                msgEl.innerHTML = 'Thank you for your patience.<br>Your match will be revealed soon!';
            }
        }

        // Start countdown to Feb 10
        startCountdown();

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

function startCountdown() {
    const revealDate = CONFIG.REVEAL_DATE;

    function updateCountdown() {
        const now = new Date();
        const diff = revealDate - now;

        if (diff <= 0) {
            // Reveal date arrived!
            document.getElementById('days').textContent = '00';
            document.getElementById('hours').textContent = '00';
            document.getElementById('minutes').textContent = '00';
            document.getElementById('seconds').textContent = '00';

            // Show a message instead of auto-redirecting
            const msgEl = document.getElementById('match-message');
            if (msgEl) {
                msgEl.innerHTML = '🎉 It\'s reveal time! <a href="reveal.html" class="text-pink">Click here to see your match!</a>';
            }

            // Stop the interval
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
