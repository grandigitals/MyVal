// =====================================================
// MY VAL - UI Module
// =====================================================

const UI = {
    // Current active screen
    currentScreen: null,

    // Toast container
    toastContainer: null,

    // Initialize UI
    init() {
        this.createToastContainer();
    },

    // Navigate to a screen
    navigateTo(screenId) {
        // Hide all screens
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });

        // Show target screen
        const targetScreen = document.getElementById(screenId);
        if (targetScreen) {
            targetScreen.classList.add('active');
            this.currentScreen = screenId;
            window.scrollTo(0, 0);
        }
    },

    // Create toast container
    createToastContainer() {
        if (!this.toastContainer) {
            this.toastContainer = document.createElement('div');
            this.toastContainer.className = 'toast-container';
            document.body.appendChild(this.toastContainer);
        }
    },

    // Show toast notification
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;

        this.toastContainer.appendChild(toast);

        // Remove after 4 seconds
        setTimeout(() => {
            toast.style.animation = 'slideIn 0.3s ease reverse';
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    },

    // Show success toast
    success(message) {
        this.showToast(message, 'success');
    },

    // Show error toast
    error(message) {
        this.showToast(message, 'error');
    },

    // Show warning toast
    warning(message) {
        this.showToast(message, 'warning');
    },

    // Render landing page
    renderLanding() {
        return `
            <div id="landing-screen" class="screen">
                <nav class="navbar">
                    <div class="logo">
                        <span class="logo-icon">V</span>
                        <span>My Val</span>
                    </div>
                    <div class="nav-links">
                        <a href="#" class="nav-link" onclick="App.navigate('login')">Login</a>
                        <button class="btn btn-primary" onclick="App.navigate('signup')">Get Started</button>
                    </div>
                </nav>
                
                <section class="hero">
                    <div class="hero-badge">
                        <span>💗</span>
                        <span>AI-Powered Matchmaking</span>
                    </div>
                    
                    <h1 class="hero-title">We'll Find Your<br>Valentine.</h1>
                    
                    <p class="hero-subtitle">
                        No chatting. No swiping. No endless scrolling.<br>
                        Just one perfect match, revealed on Valentine's season.<br>
                        Let our AI find your Valentine for you.
                    </p>
                    
                    <div class="hero-cta">
                        <button class="btn btn-primary btn-large" onclick="App.navigate('signup')">
                            Get My Val 💗
                        </button>
                        
                        <div class="reveal-date">
                            <span>📅</span>
                            <span>Match reveal on <strong>February 10th, 2026</strong></span>
                        </div>
                    </div>
                    
                    <div class="features">
                        <div class="feature-card card">
                            <div class="feature-icon">🤖</div>
                            <h3 class="feature-title">AI Matchmaking</h3>
                            <p class="feature-desc">Our algorithm finds your perfect match based on location, preferences, and compatibility.</p>
                        </div>
                        
                        <div class="feature-card card">
                            <div class="feature-icon">🔒</div>
                            <h3 class="feature-title">No Messaging</h3>
                            <p class="feature-desc">No chat features. No awkward conversations. Just a direct phone number reveal.</p>
                        </div>
                        
                        <div class="feature-card card">
                            <div class="feature-icon">💝</div>
                            <h3 class="feature-title">One Reveal</h3>
                            <p class="feature-desc">On February 10th, your match's name and phone number are revealed. That's it.</p>
                        </div>
                    </div>
                </section>
                
                <footer class="footer">
                    <div class="footer-links">
                        <a href="#" class="footer-link" onclick="App.navigate('terms')">Terms of Service</a>
                        <a href="#" class="footer-link" onclick="App.navigate('privacy')">Privacy Policy</a>
                    </div>
                    <p class="footer-copy">© 2026 My Val. All rights reserved.</p>
                </footer>
            </div>
        `;
    },

    // Render signup page
    renderSignup() {
        const cityOptions = CITIES.map(city =>
            `<option value="${city}">${city}</option>`
        ).join('');

        const genderOptions = GENDER_OPTIONS.map(g =>
            `<option value="${g.value}">${g.label}</option>`
        ).join('');

        const preferenceOptions = PREFERENCE_OPTIONS.map(p =>
            `<option value="${p.value}">${p.label}</option>`
        ).join('');

        // Calculate max date (must be 18+)
        const maxDate = new Date();
        maxDate.setFullYear(maxDate.getFullYear() - 18);
        const maxDateStr = maxDate.toISOString().split('T')[0];

        return `
            <div id="signup-screen" class="screen auth-screen">
                <div class="auth-container">
                    <div class="auth-header">
                        <div class="auth-logo">💗</div>
                        <h1 class="auth-title">Create Account</h1>
                        <p class="auth-subtitle">Join My Val and find your Valentine</p>
                    </div>
                    
                    <form class="auth-form card card-glass" id="signup-form" onsubmit="App.handleSignup(event)">
                        <div class="form-group">
                            <label class="form-label">Full Name *</label>
                            <input type="text" class="form-input" name="fullName" placeholder="Enter your full name" required>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Email *</label>
                            <input type="email" class="form-input" name="email" placeholder="Enter your email" required>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Password *</label>
                            <input type="password" class="form-input" name="password" placeholder="Create a password" minlength="6" required>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Phone Number *</label>
                            <input type="tel" class="form-input" name="phoneNumber" placeholder="e.g. 08012345678" required>
                            <small class="text-muted text-sm">This will be shared with your match on reveal day</small>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">I am a *</label>
                            <select class="form-select" name="gender" required>
                                <option value="">Select your gender</option>
                                ${genderOptions}
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">I'm interested in *</label>
                            <select class="form-select" name="genderPreference" required>
                                <option value="">Select preference</option>
                                ${preferenceOptions}
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">City *</label>
                            <select class="form-select" name="city" required>
                                <option value="">Select your city</option>
                                ${cityOptions}
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Date of Birth *</label>
                            <input type="date" class="form-input" name="dateOfBirth" max="${maxDateStr}" required>
                        </div>
                        
                        <div class="form-group">
                            <div class="checkbox-group">
                                <input type="checkbox" class="checkbox-input" id="ageConfirm" name="ageConfirm" required>
                                <label class="checkbox-label" for="ageConfirm">
                                    I confirm that I am 18 years or older and agree to the 
                                    <a href="#" onclick="App.navigate('terms')">Terms of Service</a> and 
                                    <a href="#" onclick="App.navigate('privacy')">Privacy Policy</a>
                                </label>
                            </div>
                        </div>
                        
                        <button type="submit" class="btn btn-primary btn-large" style="width: 100%">
                            Create Account
                        </button>
                    </form>
                    
                    <p class="auth-footer">
                        Already have an account? <a href="#" onclick="App.navigate('login')">Login</a>
                    </p>
                </div>
            </div>
        `;
    },

    // Render login page
    renderLogin() {
        return `
            <div id="login-screen" class="screen auth-screen">
                <div class="auth-container">
                    <div class="auth-header">
                        <div class="auth-logo">💗</div>
                        <h1 class="auth-title">Welcome Back</h1>
                        <p class="auth-subtitle">Login to check your match status</p>
                    </div>
                    
                    <form class="auth-form card card-glass" id="login-form" onsubmit="App.handleLogin(event)">
                        <div class="form-group">
                            <label class="form-label">Email</label>
                            <input type="email" class="form-input" name="email" placeholder="Enter your email" required>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Password</label>
                            <input type="password" class="form-input" name="password" placeholder="Enter your password" required>
                        </div>
                        
                        <button type="submit" class="btn btn-primary btn-large" style="width: 100%">
                            Login
                        </button>
                    </form>
                    
                    <p class="auth-footer">
                        Don't have an account? <a href="#" onclick="App.navigate('signup')">Sign up</a>
                    </p>
                </div>
            </div>
        `;
    },

    // Render dashboard
    renderDashboard(user) {
        const matchStatus = Matching.getMatchStatus(user.id);
        const isRevealDate = Database.isRevealDate();

        // Determine status badges
        let paymentBadge = user.paymentStatus === 'paid'
            ? '<span class="badge badge-success">✓ Paid</span>'
            : '<span class="badge badge-warning">Payment Required</span>';

        let matchBadge;
        switch (matchStatus.status) {
            case 'revealed':
                matchBadge = '<span class="badge badge-success">💗 Match Revealed!</span>';
                break;
            case 'matched':
                matchBadge = '<span class="badge badge-pink">Match Found</span>';
                break;
            case 'searching':
                matchBadge = '<span class="badge badge-warning">Searching...</span>';
                break;
            default:
                matchBadge = '<span class="badge badge-error">Awaiting Payment</span>';
        }

        // Action button
        let actionButton;
        if (user.paymentStatus !== 'paid') {
            actionButton = `<button class="btn btn-primary btn-large" onclick="App.navigate('payment')">Get Matched</button>`;
        } else if (matchStatus.status === 'revealed') {
            actionButton = `<button class="btn btn-primary btn-large" onclick="App.navigate('reveal')">View Your Match 💗</button>`;
        } else {
            actionButton = `<button class="btn btn-secondary btn-large" onclick="App.navigate('waiting')">View Countdown</button>`;
        }

        return `
            <div id="dashboard-screen" class="screen dashboard-screen">
                <nav class="navbar">
                    <div class="logo">
                        <span class="logo-icon">V</span>
                        <span>My Val</span>
                    </div>
                    <div class="nav-links">
                        <button class="btn btn-secondary" onclick="App.logout()">Logout</button>
                    </div>
                </nav>
                
                <div class="container section">
                    <div class="dashboard-header">
                        <p class="dashboard-welcome">Welcome back,</p>
                        <h1 class="dashboard-name">${user.fullName} 💗</h1>
                    </div>
                    
                    <div class="status-grid">
                        <div class="status-card card card-glass">
                            <div class="status-card-header">
                                <div class="status-icon">👤</div>
                                <div>
                                    <p class="status-label">Profile Status</p>
                                    <p class="status-value"><span class="badge badge-success">✓ Complete</span></p>
                                </div>
                            </div>
                        </div>
                        
                        <div class="status-card card card-glass">
                            <div class="status-card-header">
                                <div class="status-icon">💳</div>
                                <div>
                                    <p class="status-label">Payment Status</p>
                                    <p class="status-value">${paymentBadge}</p>
                                </div>
                            </div>
                        </div>
                        
                        <div class="status-card card card-glass">
                            <div class="status-card-header">
                                <div class="status-icon">💗</div>
                                <div>
                                    <p class="status-label">Match Status</p>
                                    <p class="status-value">${matchBadge}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="text-center mt-xl">
                        ${actionButton}
                    </div>
                    
                    <div class="card mt-xl">
                        <h3>Your Profile</h3>
                        <div class="mt-lg">
                            <p><strong>Email:</strong> ${user.email}</p>
                            <p><strong>Phone:</strong> ${user.phoneNumber}</p>
                            <p><strong>City:</strong> ${user.city}</p>
                            <p><strong>Gender:</strong> ${user.gender}</p>
                            <p><strong>Looking for:</strong> ${user.genderPreference === 'any' ? 'Anyone' : user.genderPreference}</p>
                        </div>
                    </div>
                </div>
                
                <footer class="footer">
                    <div class="footer-links">
                        <a href="#" class="footer-link" onclick="App.navigate('terms')">Terms</a>
                        <a href="#" class="footer-link" onclick="App.navigate('privacy')">Privacy</a>
                    </div>
                </footer>
            </div>
        `;
    },

    // Render payment page
    renderPayment(user) {
        const amount = Payment.getDisplayAmount();

        return `
            <div id="payment-screen" class="screen payment-screen">
                <div class="payment-container">
                    <div class="payment-icon float">💝</div>
                    
                    <h1 class="payment-title">Complete Your Payment</h1>
                    <p class="payment-desc">One-time payment to unlock AI matchmaking and find your Valentine</p>
                    
                    <div class="payment-card card card-glass">
                        <div class="payment-amount">${amount}</div>
                        <p class="payment-currency">One-time payment</p>
                        
                        <div class="payment-includes">
                            <p class="payment-includes-title">What you get:</p>
                            <ul class="payment-includes-list">
                                <li>AI-powered matchmaking</li>
                                <li>Match based on location & preferences</li>
                                <li>Match reveal on February 10th</li>
                                <li>Direct phone number access</li>
                            </ul>
                        </div>
                    </div>
                    
                    <button class="btn btn-primary btn-large" onclick="App.initiatePayment()" style="width: 100%">
                        Pay with Paystack
                    </button>
                    
                    <button class="btn btn-secondary mt-lg" onclick="App.navigate('dashboard')">
                        ← Back to Dashboard
                    </button>
                </div>
            </div>
        `;
    },

    // Render waiting screen
    renderWaiting(user) {
        const matchStatus = Matching.getMatchStatus(user.id);

        return `
            <div id="waiting-screen" class="screen waiting-screen">
                <div class="waiting-container">
                    <div class="waiting-heart heartbeat">💗</div>
                    
                    <h1 class="waiting-title">We're Getting Your Match</h1>
                    <p class="waiting-message">
                        ${matchStatus.status === 'matched'
                ? "Your match has been found! 🎉<br>Hold tight until the big reveal."
                : "Our AI is working to find your perfect match.<br>Thank you for your patience."
            }
                    </p>
                    
                    <div class="countdown" id="countdown">
                        <div class="countdown-item">
                            <span class="countdown-value" id="days">--</span>
                            <span class="countdown-label">Days</span>
                        </div>
                        <div class="countdown-item">
                            <span class="countdown-value" id="hours">--</span>
                            <span class="countdown-label">Hours</span>
                        </div>
                        <div class="countdown-item">
                            <span class="countdown-value" id="minutes">--</span>
                            <span class="countdown-label">Minutes</span>
                        </div>
                        <div class="countdown-item">
                            <span class="countdown-value" id="seconds">--</span>
                            <span class="countdown-label">Seconds</span>
                        </div>
                    </div>
                    
                    <p class="text-muted mb-xl">Match reveal on <strong class="text-pink">February 10th, 2026</strong></p>
                    
                    <div class="waiting-note">
                        💡 Your match's phone number will be revealed on the reveal date. No chatting required!
                    </div>
                    
                    <button class="btn btn-secondary mt-xl" onclick="App.navigate('dashboard')">
                        ← Back to Dashboard
                    </button>
                </div>
            </div>
        `;
    },

    // Render reveal screen
    renderReveal(user) {
        const match = Matching.getMatchDetails(user.id);
        const isRevealDate = Database.isRevealDate();

        if (!isRevealDate) {
            return `
                <div id="reveal-screen" class="screen reveal-screen">
                    <div class="reveal-container">
                        <div class="no-match">
                            <div class="no-match-icon">🔒</div>
                            <h2 class="no-match-title">Not Yet!</h2>
                            <p class="no-match-message">Your match will be revealed on February 10th, 2026.</p>
                            <button class="btn btn-primary mt-xl" onclick="App.navigate('waiting')">
                                View Countdown
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }

        if (!match) {
            return `
                <div id="reveal-screen" class="screen reveal-screen">
                    <div class="reveal-container">
                        <div class="no-match">
                            <div class="no-match-icon">😔</div>
                            <h2 class="no-match-title">No Match Found</h2>
                            <p class="no-match-message">
                                Unfortunately, we couldn't find a compatible match for you this time.<br>
                                This could be due to limited users in your area with matching preferences.
                            </p>
                            <button class="btn btn-secondary mt-xl" onclick="App.navigate('dashboard')">
                                Back to Dashboard
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }

        const genderEmoji = match.gender === 'female' ? '👩' : match.gender === 'male' ? '👨' : '🧑';

        return `
            <div id="reveal-screen" class="screen reveal-screen">
                <div class="reveal-container">
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
                    
                    <button class="btn btn-secondary mt-xl" onclick="App.navigate('dashboard')">
                        ← Back to Dashboard
                    </button>
                </div>
            </div>
        `;
    },

    // Render terms page
    renderTerms() {
        return `
            <div id="terms-screen" class="screen legal-screen">
                <nav class="navbar">
                    <div class="logo" onclick="App.goHome()" style="cursor: pointer">
                        <span class="logo-icon">V</span>
                        <span>My Val</span>
                    </div>
                    <div class="nav-links">
                        <button class="btn btn-secondary" onclick="history.back()">← Back</button>
                    </div>
                </nav>
                
                <div class="legal-container">
                    <h1 class="legal-title">Terms of Service</h1>
                    
                    <div class="legal-content">
                        <p>Last updated: January 2026</p>
                        
                        <h2>1. Acceptance of Terms</h2>
                        <p>By using My Val, you agree to these Terms of Service. If you do not agree, please do not use our service.</p>
                        
                        <h2>2. Eligibility</h2>
                        <p>You must be at least 18 years old to use My Val. By creating an account, you confirm that you are 18 years of age or older.</p>
                        
                        <h2>3. Service Description</h2>
                        <p>My Val is a one-time Valentine's Day matchmaking service. We use AI algorithms to match users based on location, preferences, and compatibility. Matches are revealed on February 10th.</p>
                        
                        <h2>4. Payment</h2>
                        <p>Payment is a one-time, non-refundable fee. By making a payment, you understand that:</p>
                        <ul>
                            <li>There is no guarantee of a match</li>
                            <li>Payments cannot be refunded</li>
                            <li>You are paying for the matchmaking service, not a guaranteed result</li>
                        </ul>
                        
                        <h2>5. User Conduct</h2>
                        <p>You agree to:</p>
                        <ul>
                            <li>Provide accurate information</li>
                            <li>Not use fake or misleading profiles</li>
                            <li>Treat your match with respect</li>
                            <li>Not use the service for harassment or illegal purposes</li>
                        </ul>
                        
                        <h2>6. Privacy</h2>
                        <p>Your phone number is kept private until the reveal date. On the reveal date, your phone number will be shared with your match only.</p>
                        
                        <h2>7. Limitation of Liability</h2>
                        <p>My Val is not responsible for any interactions between matched users after the reveal. We do not screen users for criminal history.</p>
                        
                        <h2>8. Contact</h2>
                        <p>For questions about these terms, please contact support@myval.com</p>
                    </div>
                </div>
            </div>
        `;
    },

    // Render privacy page
    renderPrivacy() {
        return `
            <div id="privacy-screen" class="screen legal-screen">
                <nav class="navbar">
                    <div class="logo" onclick="App.goHome()" style="cursor: pointer">
                        <span class="logo-icon">V</span>
                        <span>My Val</span>
                    </div>
                    <div class="nav-links">
                        <button class="btn btn-secondary" onclick="history.back()">← Back</button>
                    </div>
                </nav>
                
                <div class="legal-container">
                    <h1 class="legal-title">Privacy Policy</h1>
                    
                    <div class="legal-content">
                        <p>Last updated: January 2026</p>
                        
                        <h2>1. Information We Collect</h2>
                        <p>We collect the following information:</p>
                        <ul>
                            <li>Full name</li>
                            <li>Email address</li>
                            <li>Phone number</li>
                            <li>Gender and gender preference</li>
                            <li>City/Location</li>
                            <li>Date of birth</li>
                            <li>Payment information (processed by Paystack)</li>
                        </ul>
                        
                        <h2>2. How We Use Your Information</h2>
                        <p>Your information is used to:</p>
                        <ul>
                            <li>Create and manage your account</li>
                            <li>Match you with compatible users</li>
                            <li>Process payments</li>
                            <li>Reveal your match on February 10th</li>
                        </ul>
                        
                        <h2>3. Phone Number Privacy</h2>
                        <p><strong>Important:</strong> Your phone number is kept strictly private until February 10th. On the reveal date, your phone number will ONLY be shared with your matched user.</p>
                        
                        <h2>4. Data Security</h2>
                        <p>We implement security measures to protect your data. Payment processing is handled by Paystack, a PCI-compliant payment processor.</p>
                        
                        <h2>5. Data Retention</h2>
                        <p>We retain your data for the duration of the matchmaking season. You may request deletion of your data by contacting us.</p>
                        
                        <h2>6. Third-Party Services</h2>
                        <p>We use Paystack for payment processing. Their privacy policy applies to payment data.</p>
                        
                        <h2>7. Your Rights</h2>
                        <p>You have the right to:</p>
                        <ul>
                            <li>Access your personal data</li>
                            <li>Request correction of your data</li>
                            <li>Request deletion of your data</li>
                        </ul>
                        
                        <h2>8. Contact Us</h2>
                        <p>For privacy concerns, contact privacy@myval.com</p>
                    </div>
                </div>
            </div>
        `;
    },

    // Start countdown timer
    startCountdown() {
        const updateCountdown = () => {
            const now = new Date();
            const diff = CONFIG.REVEAL_DATE - now;

            if (diff <= 0) {
                // Reveal date has arrived!
                document.getElementById('days').textContent = '00';
                document.getElementById('hours').textContent = '00';
                document.getElementById('minutes').textContent = '00';
                document.getElementById('seconds').textContent = '00';
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
        };

        updateCountdown();
        setInterval(updateCountdown, 1000);
    }
};
