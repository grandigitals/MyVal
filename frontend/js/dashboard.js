// =====================================================
// MY VAL - Dashboard Page Logic
// =====================================================

document.addEventListener('DOMContentLoaded', async function () {
    // Require authentication
    try {
        const authUser = await Auth.requireAuth();
        loadDashboard(authUser.uid);
    } catch (error) {
        console.error('Auth required');
    }

    // Logout button
    document.getElementById('logout-btn').addEventListener('click', function () {
        Auth.logout();
    });
});

async function loadDashboard(uid) {
    const userData = await Database.getUser(uid);

    if (!userData) {
        console.error('User data not found');
        return;
    }

    // Update user name
    document.getElementById('user-name').textContent = userData.fullName + ' 💗';

    // Update profile details
    document.getElementById('profile-email').textContent = userData.email;
    document.getElementById('profile-phone').textContent = userData.phoneNumber;
    document.getElementById('profile-city').textContent = userData.city;
    document.getElementById('profile-gender').textContent = capitalizeFirst(userData.gender);

    // Update payment status
    const paymentStatus = document.getElementById('payment-status');
    const matchStatus = document.getElementById('match-status');
    const actionContainer = document.getElementById('action-container');

    if (userData.paymentStatus === 'paid') {
        paymentStatus.innerHTML = '<span class="badge badge-success">✓ Paid</span>';

        // Check match status
        if (userData.matchId) {
            const isReveal = Database.isRevealDate();
            if (isReveal) {
                matchStatus.innerHTML = '<span class="badge badge-success">💗 Match Revealed!</span>';
                actionContainer.innerHTML = '<a href="reveal.html" class="btn btn-primary btn-large">View Your Match 💗</a>';
            } else {
                matchStatus.innerHTML = '<span class="badge badge-pink">Match Found!</span>';
                actionContainer.innerHTML = '<a href="waiting.html" class="btn btn-primary btn-large">View Countdown</a>';
            }
        } else {
            matchStatus.innerHTML = '<span class="badge badge-warning">Searching...</span>';
            actionContainer.innerHTML = '<a href="waiting.html" class="btn btn-secondary btn-large">View Countdown</a>';
        }
    } else {
        paymentStatus.innerHTML = '<span class="badge badge-warning">Payment Required</span>';
        matchStatus.innerHTML = '<span class="badge badge-error">Awaiting Payment</span>';
        actionContainer.innerHTML = '<a href="payment.html" class="btn btn-primary btn-large">Get Matched</a>';
    }
}

function capitalizeFirst(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}
