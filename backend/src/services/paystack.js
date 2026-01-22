// =====================================================
// MY VAL BACKEND - Paystack Service
// =====================================================

const axios = require('axios');

const PAYSTACK_BASE_URL = 'https://api.paystack.co';
const SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

/**
 * Initialize a payment with Paystack
 */
async function initializePayment({ email, amount, userId, metadata }) {
    try {
        const reference = `MYVAL_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`.toUpperCase();

        const response = await axios.post(
            `${PAYSTACK_BASE_URL}/transaction/initialize`,
            {
                email,
                amount, // Amount in kobo
                reference,
                callback_url: `${process.env.FRONTEND_URL}/payment-verify.html`,
                metadata: {
                    userId,
                    ...metadata,
                    custom_fields: [
                        {
                            display_name: 'User ID',
                            variable_name: 'user_id',
                            value: userId
                        }
                    ]
                }
            },
            {
                headers: {
                    Authorization: `Bearer ${SECRET_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (response.data.status) {
            return {
                success: true,
                authorization_url: response.data.data.authorization_url,
                access_code: response.data.data.access_code,
                reference: response.data.data.reference
            };
        } else {
            return {
                success: false,
                error: response.data.message || 'Payment initialization failed'
            };
        }

    } catch (error) {
        console.error('Paystack init error:', error.response?.data || error.message);
        return {
            success: false,
            error: error.response?.data?.message || error.message
        };
    }
}

/**
 * Verify a payment with Paystack
 */
async function verifyPayment(reference) {
    try {
        const response = await axios.get(
            `${PAYSTACK_BASE_URL}/transaction/verify/${reference}`,
            {
                headers: {
                    Authorization: `Bearer ${SECRET_KEY}`
                }
            }
        );

        const data = response.data.data;

        if (response.data.status && data.status === 'success') {
            return {
                success: true,
                reference: data.reference,
                amount: data.amount,
                paid_at: data.paid_at,
                channel: data.channel,
                metadata: data.metadata
            };
        } else {
            return {
                success: false,
                error: `Payment not successful. Status: ${data.status}`
            };
        }

    } catch (error) {
        console.error('Paystack verify error:', error.response?.data || error.message);
        return {
            success: false,
            error: error.response?.data?.message || error.message
        };
    }
}

module.exports = {
    initializePayment,
    verifyPayment
};
