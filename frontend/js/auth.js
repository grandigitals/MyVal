// =====================================================
// MY VAL - Authentication Module
// =====================================================

const Auth = {
    currentUser: null,

    // Initialize Firebase Auth
    init() {
        // For demo purposes, we'll use localStorage
        // In production, use Firebase Auth
        this.loadUser();
    },

    // Check if user is logged in
    isLoggedIn() {
        return this.currentUser !== null;
    },

    // Load user from storage
    loadUser() {
        const userData = localStorage.getItem('myval_user');
        if (userData) {
            this.currentUser = JSON.parse(userData);
        }
    },

    // Save user to storage
    saveUser(user) {
        this.currentUser = user;
        localStorage.setItem('myval_user', JSON.stringify(user));
    },

    // Sign up new user
    async signup(userData) {
        try {
            // Validate required fields
            const requiredFields = ['email', 'password', 'fullName', 'phoneNumber', 'gender', 'genderPreference', 'city', 'dateOfBirth'];
            for (const field of requiredFields) {
                if (!userData[field]) {
                    throw new Error(`${field} is required`);
                }
            }

            // Validate age
            const age = this.calculateAge(new Date(userData.dateOfBirth));
            if (age < CONFIG.MIN_AGE) {
                throw new Error('You must be at least 18 years old');
            }

            // Validate email format
            if (!this.isValidEmail(userData.email)) {
                throw new Error('Please enter a valid email address');
            }

            // Validate phone number
            if (!this.isValidPhone(userData.phoneNumber)) {
                throw new Error('Please enter a valid phone number');
            }

            // Check if email already exists
            const existingUsers = Database.getAllUsers();
            if (existingUsers.some(u => u.email === userData.email)) {
                throw new Error('Email already registered');
            }

            // Check if phone already exists
            if (existingUsers.some(u => u.phoneNumber === userData.phoneNumber)) {
                throw new Error('Phone number already registered');
            }

            // Create user object
            const user = {
                id: this.generateId(),
                email: userData.email,
                password: this.hashPassword(userData.password), // In production, hash properly
                fullName: userData.fullName,
                phoneNumber: userData.phoneNumber,
                gender: userData.gender,
                genderPreference: userData.genderPreference,
                city: userData.city,
                dateOfBirth: userData.dateOfBirth,
                ageVerified: true,
                paymentStatus: 'unpaid',
                paystackReference: null,
                matchId: null,
                matchRevealed: false,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            // Save to database
            Database.saveUser(user);

            // Set as current user (without password)
            const safeUser = { ...user };
            delete safeUser.password;
            this.saveUser(safeUser);

            return { success: true, user: safeUser };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    // Login user
    async login(email, password) {
        try {
            const users = Database.getAllUsers();
            const user = users.find(u => u.email === email);

            if (!user) {
                throw new Error('Invalid email or password');
            }

            if (user.password !== this.hashPassword(password)) {
                throw new Error('Invalid email or password');
            }

            // Set as current user (without password)
            const safeUser = { ...user };
            delete safeUser.password;
            this.saveUser(safeUser);

            return { success: true, user: safeUser };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    // Logout user
    logout() {
        this.currentUser = null;
        localStorage.removeItem('myval_user');
    },

    // Update user data
    updateUser(updates) {
        if (!this.currentUser) return;

        const updatedUser = {
            ...this.currentUser,
            ...updates,
            updatedAt: new Date().toISOString()
        };

        this.saveUser(updatedUser);
        Database.updateUser(updatedUser.id, updates);
    },

    // Helper: Generate unique ID
    generateId() {
        return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    },

    // Helper: Simple hash (use bcrypt in production)
    hashPassword(password) {
        // Simple hash for demo - use proper hashing in production!
        let hash = 0;
        for (let i = 0; i < password.length; i++) {
            const char = password.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return 'hash_' + Math.abs(hash).toString(16);
    },

    // Helper: Validate email
    isValidEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    },

    // Helper: Validate phone
    isValidPhone(phone) {
        // Nigerian phone format
        const cleaned = phone.replace(/\D/g, '');
        return cleaned.length >= 10 && cleaned.length <= 14;
    },

    // Helper: Calculate age
    calculateAge(birthDate) {
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();

        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }

        return age;
    },

    // Get current user's age
    getCurrentUserAge() {
        if (!this.currentUser || !this.currentUser.dateOfBirth) return null;
        return this.calculateAge(new Date(this.currentUser.dateOfBirth));
    }
};
