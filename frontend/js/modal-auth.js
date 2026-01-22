// =====================================================
// MY VAL - Modal Authentication Logic
// =====================================================

// Modal functions
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

function switchModal(fromId, toId) {
    closeModal(fromId);
    setTimeout(() => openModal(toId), 200);
}

// Close modal on overlay click
document.addEventListener('click', function (e) {
    if (e.target.classList.contains('modal-overlay')) {
        e.target.classList.remove('active');
        document.body.style.overflow = '';
    }
});

// Close modal on Escape key
document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay.active').forEach(modal => {
            modal.classList.remove('active');
        });
        document.body.style.overflow = '';
    }
});

// Set max date for DOB (must be 18+)
document.addEventListener('DOMContentLoaded', function () {
    const dobInput = document.getElementById('signup-dob');
    if (dobInput) {
        const maxDate = new Date();
        maxDate.setFullYear(maxDate.getFullYear() - 18);
        dobInput.max = maxDate.toISOString().split('T')[0];
    }

    // Login form handler
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // Signup form handler
    const signupForm = document.getElementById('signup-form');
    if (signupForm) {
        signupForm.addEventListener('submit', handleSignup);
    }
});

// Handle Login
async function handleLogin(e) {
    e.preventDefault();

    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const errorEl = document.getElementById('login-error');
    const btn = document.getElementById('login-btn');

    errorEl.style.display = 'none';
    btn.disabled = true;
    btn.textContent = 'Logging in...';

    try {
        const result = await Auth.login(email, password);

        if (result.success) {
            window.location.href = 'dashboard.html';
        } else {
            errorEl.textContent = result.error;
            errorEl.style.display = 'block';
            btn.disabled = false;
            btn.textContent = 'Login';
        }
    } catch (error) {
        errorEl.textContent = 'An error occurred. Please try again.';
        errorEl.style.display = 'block';
        btn.disabled = false;
        btn.textContent = 'Login';
    }
}

// Handle Signup
async function handleSignup(e) {
    e.preventDefault();

    const fullName = document.getElementById('signup-fullName').value.trim();
    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;
    const phoneNumber = document.getElementById('signup-phone').value.trim();
    const gender = document.getElementById('signup-gender').value;
    const city = document.getElementById('signup-city').value;
    const dateOfBirth = document.getElementById('signup-dob').value;
    const ageConfirm = document.getElementById('signup-age').checked;

    const errorEl = document.getElementById('signup-error');
    const btn = document.getElementById('signup-btn');

    errorEl.style.display = 'none';

    // Validation
    if (!ageConfirm) {
        errorEl.textContent = 'You must confirm you are 18 or older';
        errorEl.style.display = 'block';
        return;
    }

    const age = calculateAge(dateOfBirth);
    if (age < 18) {
        errorEl.textContent = 'You must be at least 18 years old';
        errorEl.style.display = 'block';
        return;
    }

    if (!isValidPhone(phoneNumber)) {
        errorEl.textContent = 'Please enter a valid phone number';
        errorEl.style.display = 'block';
        return;
    }

    // Check if phone exists
    const phoneExists = await Database.phoneExists(phoneNumber);
    if (phoneExists) {
        errorEl.textContent = 'This phone number is already registered';
        errorEl.style.display = 'block';
        return;
    }

    btn.disabled = true;
    btn.textContent = 'Creating account...';

    try {
        // Create auth account
        const authResult = await Auth.signup(email, password);

        if (!authResult.success) {
            errorEl.textContent = authResult.error;
            errorEl.style.display = 'block';
            btn.disabled = false;
            btn.textContent = 'Create Account';
            return;
        }

        // Auto-set gender preference (opposite gender)
        const genderPreference = gender === 'male' ? 'female' : gender === 'female' ? 'male' : 'any';

        // Save user data
        const userData = {
            uid: authResult.user.uid,
            email: email,
            password: password,
            fullName: fullName,
            phoneNumber: phoneNumber,
            gender: gender,
            genderPreference: genderPreference,
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
        errorEl.textContent = 'An error occurred. Please try again.';
        errorEl.style.display = 'block';
        btn.disabled = false;
        btn.textContent = 'Create Account';
    }
}
