// =====================================================
// MY VAL BACKEND - Payment Routes
// =====================================================

const express = require('express');
const router = express.Router();
const paystackService = require('../services/paystack');
const firebaseService = require('../services/firebase');
const matchingService = require('../services/matching');

/**
 * POST /pay/initiate
 * Initialize a Paystack payment
 * Body: { email, userId, amount? }
 */
router.post('/initiate', async (req, res) => {
    try {
        const { email, userId, amount } = req.body;

        if (!email || !userId) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: email, userId'
            });
        }

        // Check if user exists and hasn't paid
        const user = await firebaseService.getUser(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        if (user.paymentStatus === 'paid' || user.is_premium) {
            return res.status(400).json({
                success: false,
                error: 'User has already paid'
            });
        }

        // Initialize payment with Paystack
        const paymentAmount = amount || parseInt(process.env.PAYMENT_AMOUNT) || 200000;
        const result = await paystackService.initializePayment({
            email,
            amount: paymentAmount,
            userId,
            metadata: {
                userId,
                fullName: user.fullName || user.displayName || 'User'
            }
        });

        if (!result.success) {
            return res.status(500).json({
                success: false,
                error: result.error || 'Failed to initialize payment'
            });
        }

        // Store pending payment reference
        await firebaseService.updateUser(userId, {
            pendingPaymentRef: result.reference,
            pendingPaymentAt: new Date().toISOString()
        });

        res.json({
            success: true,
            authorization_url: result.authorization_url,
            reference: result.reference,
            access_code: result.access_code
        });

    } catch (error) {
        console.error('Payment initiation error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to initiate payment',
            message: error.message
        });
    }
});

/**
 * GET /pay/verify
 * Verify a Paystack payment
 * Query: ?reference=xxx&userId=xxx
 */
router.get('/verify', async (req, res) => {
    try {
        const { reference, userId } = req.query;

        if (!reference) {
            return res.status(400).json({
                success: false,
                error: 'Missing payment reference'
            });
        }

        // Verify payment with Paystack
        const verification = await paystackService.verifyPayment(reference);

        if (!verification.success) {
            return res.status(400).json({
                success: false,
                error: verification.error || 'Payment verification failed'
            });
        }

        // Payment successful - update user
        const uid = userId || verification.metadata?.userId;

        if (!uid) {
            return res.status(400).json({
                success: false,
                error: 'Could not identify user from payment'
            });
        }

        // Mark user as paid
        await firebaseService.updateUser(uid, {
            paymentStatus: 'paid',
            is_premium: true,
            paystackReference: reference,
            paidAt: new Date().toISOString(),
            paidAmount: verification.amount
        });

        console.log(`✅ User ${uid} marked as paid`);

        // Run matchmaking
        const matchResult = await matchingService.runMatchingForUser(uid);
        console.log(`💕 Matching result for ${uid}:`, matchResult);

        res.json({
            success: true,
            message: 'Payment verified successfully',
            data: {
                reference,
                userId: uid,
                amount: verification.amount,
                paidAt: verification.paid_at,
                matchFound: matchResult.matched
            }
        });

    } catch (error) {
        console.error('Payment verification error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to verify payment',
            message: error.message
        });
    }
});

/**
 * POST /pay/webhook
 * Paystack webhook for payment events
 */
router.post('/webhook', async (req, res) => {
    try {
        const event = req.body;
        console.log('Paystack webhook event:', event.event);

        if (event.event === 'charge.success') {
            const { reference, metadata, amount } = event.data;
            const userId = metadata?.userId;

            if (userId) {
                // Mark user as paid
                await firebaseService.updateUser(userId, {
                    paymentStatus: 'paid',
                    is_premium: true,
                    paystackReference: reference,
                    paidAt: new Date().toISOString(),
                    paidAmount: amount
                });

                // Run matchmaking
                await matchingService.runMatchingForUser(userId);
                console.log(`✅ Webhook: User ${userId} marked as paid`);
            }
        }

        res.status(200).send('OK');

    } catch (error) {
        console.error('Webhook error:', error);
        res.status(500).send('Error');
    }
});

module.exports = router;
