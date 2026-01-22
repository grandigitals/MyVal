// =====================================================
// MY VAL - Waiting Page Logic
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

        // Check if reveal date - redirect to reveal
        if (Database.isRevealDate() && userData.matchId) {
            window.location.href = 'reveal.html';
            return;
        }

        // Update message if match found
        if (userData.matchId) {
            document.getElementById('match-message').innerHTML =
                'Your match has been found! 🎉<br>Hold tight until the big reveal.';
        }

        // Start countdown
        startCountdown();

    } catch (error) {
        console.error('Auth required');
    }

    // Logout button
    document.getElementById('logout-btn').addEventListener('click', function () {
        Auth.logout();
    });
});

function startCountdown() {
    function updateCountdown() {
        const now = new Date();
        const diff = CONFIG.REVEAL_DATE - now;

        if (diff <= 0) {
            // Reveal date arrived!
            document.getElementById('days').textContent = '00';
            document.getElementById('hours').textContent = '00';
            document.getElementById('minutes').textContent = '00';
            document.getElementById('seconds').textContent = '00';

            // Redirect to reveal page after a short delay
            setTimeout(() => {
                window.location.href = 'reveal.html';
            }, 2000);
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
