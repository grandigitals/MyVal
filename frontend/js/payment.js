// =====================================================
// MY VAL - Payment Module (Paystack Integration)
// =====================================================

const Payment = {
    // Initialize Paystack payment
    initiate(user, onSuccess, onClose) {
        if (!user || !user.email) {
            console.error('User email required for payment');
            return;
        }

        const handler = PaystackPop.setup({
            key: CONFIG.PAYSTACK_PUBLIC_KEY,
            email: user.email,
            amount: CONFIG.PAYMENT_AMOUNT, // Amount in kobo
            currency: CONFIG.PAYMENT_CURRENCY,
            ref: this.generateReference(),
            metadata: {
                custom_fields: [
                    {
                        display_name: "User ID",
                        variable_name: "user_id",
                        value: user.id
                    },
                    {
                        display_name: "Full Name",
                        variable_name: "full_name",
                        value: user.fullName
                    }
                ]
            },
            callback: (response) => {
                // Payment successful
                console.log('Payment successful:', response);
                this.handleSuccess(user.id, response.reference);
                if (onSuccess) onSuccess(response);
            },
            onClose: () => {
                console.log('Payment window closed');
                if (onClose) onClose();
            }
        });

        handler.openIframe();
    },

    // Handle successful payment
    handleSuccess(userId, reference) {
        // Update user payment status
        Database.updateUser(userId, {
            paymentStatus: 'paid',
            paystackReference: reference
        });

        // Update current user
        if (Auth.currentUser && Auth.currentUser.id === userId) {
            Auth.updateUser({
                paymentStatus: 'paid',
                paystackReference: reference
            });
        }

        // Trigger matching process
        Matching.runMatchingForUser(userId);
    },

    // Generate unique payment reference
    generateReference() {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8);
        return `MYVAL_${timestamp}_${random}`.toUpperCase();
    },

    // Check if user has paid
    hasPaid(userId) {
        const user = Database.getUserById(userId);
        return user && user.paymentStatus === 'paid';
    },

    // Format amount for display
    formatAmount(amountInKobo) {
        const naira = amountInKobo / 100;
        return new Intl.NumberFormat('en-NG', {
            style: 'currency',
            currency: 'NGN'
        }).format(naira);
    },

    // Get display amount
    getDisplayAmount() {
        return this.formatAmount(CONFIG.PAYMENT_AMOUNT);
    }
};
