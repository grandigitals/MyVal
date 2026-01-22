// =====================================================
// MY VAL - Login Page Logic
// =====================================================

document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('login-form');
    const submitBtn = document.getElementById('login-btn');

    form.addEventListener('submit', async function (e) {
        e.preventDefault();
        hideError('error-message');

        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;

        // Show loading
        submitBtn.disabled = true;
        submitBtn.textContent = 'Logging in...';

        try {
            const result = await Auth.login(email, password);

            if (result.success) {
                window.location.href = 'dashboard.html';
            } else {
                showError('error-message', result.error);
                submitBtn.disabled = false;
                submitBtn.textContent = 'Login';
            }
        } catch (error) {
            console.error('Login error:', error);
            showError('error-message', 'An error occurred. Please try again.');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Login';
        }
    });
});
