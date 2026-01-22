// =====================================================
// MY VAL - Main Application
// =====================================================

const App = {
    // Initialize the application
    init() {
        console.log('🚀 My Val App Initializing...');

        // Initialize modules
        Database.init();
        Auth.init();
        UI.init();

        // Render app
        this.render();

        // Navigate to appropriate screen
        this.checkAuthAndNavigate();

        console.log('✅ My Val App Ready!');
    },

    // Render all screens to DOM
    render() {
        const app = document.getElementById('app');

        // Get current user for dashboard/payment/waiting/reveal screens
        const user = Auth.currentUser;

        // Build all screens HTML
        let html = `
            <!-- Loading Screen -->
            <div id="loading-screen" class="screen">
                <div class="loading-content">
                    <div class="heart-loader">
                        <span class="heart">💗</span>
                    </div>
                    <p>Loading...</p>
                </div>
            </div>
        `;

        // Add all screens
        html += UI.renderLanding();
        html += UI.renderSignup();
        html += UI.renderLogin();

        if (user) {
            html += UI.renderDashboard(user);
            html += UI.renderPayment(user);
            html += UI.renderWaiting(user);
            html += UI.renderReveal(user);
        }

        html += UI.renderTerms();
        html += UI.renderPrivacy();

        app.innerHTML = html;
    },

    // Check authentication and navigate
    checkAuthAndNavigate() {
        if (Auth.isLoggedIn()) {
            const user = Auth.currentUser;
            const isRevealDate = Database.isRevealDate();

            // Check if reveal date and user has match
            if (isRevealDate && user.matchId) {
                this.navigate('reveal');
            } else if (user.paymentStatus === 'paid') {
                this.navigate('waiting');
            } else {
                this.navigate('dashboard');
            }
        } else {
            this.navigate('landing');
        }
    },

    // Navigate to a screen
    navigate(screen) {
        const screenId = CONFIG.SCREENS[screen.toUpperCase()] || screen + '-screen';

        // If navigating to authenticated screens, check login
        const authScreens = ['dashboard', 'payment', 'waiting', 'reveal'];
        if (authScreens.includes(screen) && !Auth.isLoggedIn()) {
            this.navigate('login');
            return;
        }

        // Re-render if user data might have changed
        if (Auth.currentUser) {
            this.render();
        }

        UI.navigateTo(screenId);

        // Start countdown on waiting screen
        if (screen === 'waiting') {
            setTimeout(() => UI.startCountdown(), 100);
        }
    },

    // Go home
    goHome() {
        if (Auth.isLoggedIn()) {
            this.navigate('dashboard');
        } else {
            this.navigate('landing');
        }
    },

    // Handle signup form
    async handleSignup(event) {
        event.preventDefault();

        const form = event.target;
        const formData = new FormData(form);

        const userData = {
            email: formData.get('email'),
            password: formData.get('password'),
            fullName: formData.get('fullName'),
            phoneNumber: formData.get('phoneNumber'),
            gender: formData.get('gender'),
            genderPreference: formData.get('genderPreference'),
            city: formData.get('city'),
            dateOfBirth: formData.get('dateOfBirth')
        };

        // Show loading state
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Creating account...';

        const result = await Auth.signup(userData);

        if (result.success) {
            UI.success('Account created successfully!');
            this.render();
            this.navigate('dashboard');
        } else {
            UI.error(result.error);
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    },

    // Handle login form
    async handleLogin(event) {
        event.preventDefault();

        const form = event.target;
        const formData = new FormData(form);

        const email = formData.get('email');
        const password = formData.get('password');

        // Show loading state
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Logging in...';

        const result = await Auth.login(email, password);

        if (result.success) {
            UI.success('Welcome back!');
            this.render();
            this.checkAuthAndNavigate();
        } else {
            UI.error(result.error);
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    },

    // Logout
    logout() {
        Auth.logout();
        UI.success('Logged out successfully');
        this.render();
        this.navigate('landing');
    },

    // Initiate payment
    initiatePayment() {
        const user = Auth.currentUser;

        if (!user) {
            UI.error('Please login first');
            this.navigate('login');
            return;
        }

        Payment.initiate(
            user,
            // On success
            (response) => {
                UI.success('Payment successful! 🎉');
                // Refresh user data
                Auth.loadUser();
                this.render();
                this.navigate('waiting');
            },
            // On close without payment
            () => {
                UI.warning('Payment cancelled');
            }
        );
    },

    // Debug: Reveal matches early (for testing)
    debugReveal() {
        Database.revealAllMatches();
        Auth.loadUser();
        this.render();
        this.navigate('reveal');
    },

    // Debug: Clear all data
    debugClear() {
        Database.clearAll();
        Auth.logout();
        this.render();
        this.navigate('landing');
        UI.success('All data cleared');
    },

    // Debug: Add test users
    debugAddTestUsers() {
        const testUsers = [
            {
                email: 'john@test.com',
                password: 'password123',
                fullName: 'John Doe',
                phoneNumber: '08011111111',
                gender: 'male',
                genderPreference: 'female',
                city: 'Lagos',
                dateOfBirth: '1995-05-15'
            },
            {
                email: 'jane@test.com',
                password: 'password123',
                fullName: 'Jane Smith',
                phoneNumber: '08022222222',
                gender: 'female',
                genderPreference: 'male',
                city: 'Lagos',
                dateOfBirth: '1996-08-20'
            }
        ];

        testUsers.forEach(user => {
            Auth.signup(user);
        });

        // Mark them as paid
        const users = Database.getAllUsers();
        users.forEach(u => {
            Database.updateUser(u.id, { paymentStatus: 'paid' });
        });

        // Run matching
        Matching.runGlobalMatching();

        UI.success('Test users added and matched!');
    }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});

// Expose for debugging in console
window.App = App;
window.Auth = Auth;
window.Database = Database;
window.Payment = Payment;
window.Matching = Matching;
