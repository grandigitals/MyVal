// =====================================================
// MY VAL - Signup Page Logic
// =====================================================

document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('signup-form');
    const submitBtn = document.getElementById('signup-btn');


    form.addEventListener('submit', async function (e) {
        e.preventDefault();
        hideError('error-message');

        // Get form data
        const fullName = document.getElementById('fullName').value.trim();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const phoneNumber = document.getElementById('phoneNumber').value.trim();
        const gender = document.getElementById('gender').value;
        const city = document.getElementById('city').value;
        const ageConfirm = document.getElementById('ageConfirm').checked;

        // Auto-set gender preference (opposite gender)
        const genderPreference = gender === 'male' ? 'female' : gender === 'female' ? 'male' : 'any';

        // Validation
        if (!ageConfirm) {
            showError('error-message', 'You must confirm you are 18 or older');
            return;
        }


        if (!isValidPhone(phoneNumber)) {
            showError('error-message', 'Please enter a valid phone number');
            return;
        }

        // Check if phone exists
        const phoneExists = await Database.phoneExists(phoneNumber);
        if (phoneExists) {
            showError('error-message', 'This phone number is already registered');
            return;
        }

        // Show loading
        submitBtn.disabled = true;
        submitBtn.textContent = 'Creating account...';

        try {
            // Create auth account
            const authResult = await Auth.signup(email, password);

            if (!authResult.success) {
                showError('error-message', authResult.error);
                submitBtn.disabled = false;
                submitBtn.textContent = 'Create Account';
                return;
            }

            // Get referral code from URL if present
            const urlParams = new URLSearchParams(window.location.search);
            const refCode = urlParams.get('ref') || null;

            // Save user data
            const userData = {
                uid: authResult.user.uid,
                email: email,
                password: password, // Only for localStorage fallback
                fullName: fullName,
                phoneNumber: phoneNumber,
                gender: gender,
                genderPreference: genderPreference, // Auto-set based on gender
                city: city,
                ageVerified: true,
                paymentStatus: 'unpaid',
                paystackReference: null,
                matchId: null,
                matchRevealed: false,
                refCode: refCode, // Track influencer referral code
                createdAt: new Date().toISOString()
            };

            await Database.saveUser(userData);

            // Track referral signup if user has a ref code
            if (refCode) {
                try {
                    await fetch('https://myval-api.onrender.com/promo/track-signup', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ code: refCode })
                    });
                } catch (e) {
                    console.log('Referral tracking failed (non-fatal):', e);
                }
            }

            // Redirect to dashboard
            window.location.href = 'dashboard.html';

        } catch (error) {
            console.error('Signup error:', error);
            showError('error-message', 'An error occurred. Please try again.');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Create Account';
        }
    });
});
