// =====================================================
// MY VAL - Payment Page Logic (Paystack → Backend Verify → Dashboard)
// =====================================================

const API_BASE = "https://myval-api.onrender.com";
const AMOUNT_KOBO = 100000; // ₦1,000

// ===============================
// Verify payment with retry
// ===============================
async function verifyWithRetry(ref, attempts = 5, delayMs = 2000) {
    const token = await firebase.auth().currentUser.getIdToken(true);

    for (let i = 1; i <= attempts; i++) {
        const res = await fetch(`${API_BASE}/pay/verify?reference=${encodeURIComponent(ref)}`, {
            method: "GET",
            headers: { Authorization: `Bearer ${token}` }
        });

        const data = await res.json().catch(() => ({}));

        if (res.ok && data.success) return data;

        if (i < attempts) {
            console.log(`Verification retry ${i}/${attempts}`);
            await new Promise(r => setTimeout(r, delayMs));
        }
    }

    throw new Error("Verification delayed. Please wait and try again.");
}

// ===============================
// Page load
// ===============================
document.addEventListener("DOMContentLoaded", () => {
    const payBtn = document.getElementById("pay-btn");
    if (!payBtn) return;

    const defaultBtnText = payBtn.textContent || "Pay ₦1,000 to Get Matched 💗";
    payBtn.disabled = true;
    payBtn.textContent = "Loading...";

    firebase.auth().onAuthStateChanged(async (user) => {
        if (!user) {
            window.location.href = "index.html";
            return;
        }

        try {
            const userRef = db.collection("users").doc(user.uid);
            const snap = await userRef.get();

            if (snap.exists) {
                const data = snap.data() || {};
                if (data.is_premium === true && data.paymentStatus === "paid") {
                    window.location.href = "dashboard.html";
                    return;
                }
            }

            payBtn.disabled = false;
            payBtn.textContent = defaultBtnText;
            payBtn.onclick = () => startPayment(user, payBtn, defaultBtnText);

        } catch (err) {
            console.error("User load error:", err);
            payBtn.disabled = false;
            payBtn.textContent = defaultBtnText;
            payBtn.onclick = () => startPayment(user, payBtn, defaultBtnText);
        }
    });
});

// ===============================
// Start payment
// ===============================
function startPayment(user, payBtn, defaultBtnText) {
    if (typeof PaystackPop === "undefined") {
        alert("Paystack failed to load. Please refresh the page.");
        return;
    }

    if (!user?.email) {
        alert("Login expired. Please login again.");
        window.location.href = "index.html";
        return;
    }

    payBtn.disabled = true;
    payBtn.textContent = "Opening secure payment…";

    const reference = `MYVAL_${Date.now()}`;

    try {
        const handler = PaystackPop.setup({
            key: CONFIG.PAYSTACK_PUBLIC_KEY,
            email: user.email,
            amount: AMOUNT_KOBO,
            currency: "NGN",
            ref: reference,

            // ⚠️ MUST be normal function
            callback: function (response) {
                const ref = response?.reference || reference;
                payBtn.textContent = "Verifying payment…";

                (async () => {
                    try {
                        await verifyWithRetry(ref);

                        // Show success message on page
                        payBtn.style.display = "none";
                        const statusDiv = document.getElementById("payment-status");
                        if (statusDiv) {
                            statusDiv.style.display = "block";
                            document.getElementById("status-icon").textContent = "✅";
                            document.getElementById("status-text").textContent = "Payment Verified!";
                            document.getElementById("status-subtext").textContent = "Redirecting to dashboard...";
                        }

                        // Redirect after showing message
                        setTimeout(() => {
                            window.location.href = "dashboard.html";
                        }, 2000);
                    } catch (err) {
                        console.error(err);

                        // Show error on page
                        const statusDiv = document.getElementById("payment-status");
                        if (statusDiv) {
                            statusDiv.style.display = "block";
                            document.getElementById("status-icon").textContent = "⏳";
                            document.getElementById("status-text").textContent = "Verification Processing...";
                            document.getElementById("status-text").className = "text-warning";
                            document.getElementById("status-subtext").textContent = "Ref: " + ref + " - Please wait and check your dashboard.";
                        }

                        payBtn.disabled = false;
                        payBtn.textContent = defaultBtnText;
                    }
                })();
            },

            onClose: function () {
                payBtn.disabled = false;
                payBtn.textContent = defaultBtnText;
            }
        });

        handler.openIframe();
        /*
                // Safety reset if popup blocked
                setTimeout(() => {
                    if (payBtn.textContent.includes("Opening secure payment")) {
                        payBtn.disabled = false;
                        payBtn.textContent = defaultBtnText;
                        alert("Paystack popup didn’t open. Please disable popup blockers or try another browser.");
                    }
                }, 7000);
        */
    } catch (err) {
        console.error("Paystack error:", err);
        alert("Could not open Paystack. Please refresh and try again.");
        payBtn.disabled = false;
        payBtn.textContent = defaultBtnText;
    }
}
