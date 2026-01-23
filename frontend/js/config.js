

// =====================================================
// MY VAL - Configuration
// =====================================================

const CONFIG = {
    // App Info
    APP_NAME: 'My Val',
    APP_VERSION: '2.0.0',

    // Reveal Date - TESTING: Set to near time for testing
    // Change back to 'new Date('2026-02-14T00:00:00')' for production
    REVEAL_DATE: new Date('2026-01-23T14:27:00'),

    // Payment - Paystack
    PAYSTACK_PUBLIC_KEY: 'pk_test_9c369555960d671de6bf186a73eb6b594df2f357',
    PAYMENT_AMOUNT: 200000, // Amount in kobo (₦2,000)
    PAYMENT_CURRENCY: 'NGN',

    // Firebase Configuration
    // IMPORTANT: Replace these with your actual Firebase project config
    FIREBASE_CONFIG: {

        apiKey: "AIzaSyDYv2x3hJPxowWuexVdfzofnEv11F0__PQ",
        authDomain: "myval-b9f7e.firebaseapp.com",
        projectId: "myval-b9f7e",
        storageBucket: "myval-b9f7e.firebasestorage.app",
        messagingSenderId: "616573087028",
        appId: "1:616573087028:web:a3ae68ca4d4d5fe78c8961",
        measurementId: "G-6VBYGF9LXZ"
    },



    // Age Requirements
    MIN_AGE: 18,

    // Matching
    AGE_RANGE: 5 // Match within ±5 years
};

// Freeze config to prevent modifications
Object.freeze(CONFIG);
