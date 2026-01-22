// =====================================================
// MY VAL - Signup Page Logic
// =====================================================

document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('signup-form');
    const submitBtn = document.getElementById('signup-btn');

    // Set max date for DOB (must be 18+)
    const dobInput = document.getElementById('dateOfBirth');
    const maxDate = new Date();
    maxDate.setFullYear(maxDate.getFullYear() - 18);
    dobInput.max = maxDate.toISOString().split('T')[0];

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
        const dateOfBirth = document.getElementById('dateOfBirth').value;
        const ageConfirm = document.getElementById('ageConfirm').checked;

        // Auto-set gender preference (opposite gender)
        const genderPreference = gender === 'male' ? 'female' : gender === 'female' ? 'male' : 'any';

        // Validation
        if (!ageConfirm) {
            showError('error-message', 'You must confirm you are 18 or older');
            return;
        }

        const age = calculateAge(dateOfBirth);
        if (age < 18) {
            showError('error-message', 'You must be at least 18 years old');
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
                dateOfBirth: dateOfBirth,
                ageVerified: true,
                paymentStatus: 'unpaid',
                paystackReference: null,
                matchId: null,
                matchRevealed: false,
                createdAt: new Date().toISOString()
            };

            await Database.saveUser(userData);

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
