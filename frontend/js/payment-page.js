const API_BASE = "https://myval-api.onrender.com";
const AMOUNT_KOBO = 200000;

document.addEventListener("DOMContentLoaded", () => {
    const payBtn = document.getElementById("pay-btn");
    if (!payBtn) return;

    const defaultBtnText = payBtn.textContent;

    firebase.auth().onAuthStateChanged(async (user) => {
        if (!user) {
            window.location.href = "index.html";
            return;
        }

        try {
            const userRef = db.collection("users").doc(user.uid);
            const snap = await userRef.get();

            if (snap.exists && (snap.data().is_premium === true || snap.data().paymentStatus === "paid")) {
                window.location.href = "dashboard.html";
                return;
            }

            payBtn.disabled = false;
            payBtn.textContent = defaultBtnText;

            payBtn.addEventListener("click", () => startPayment(user, payBtn, defaultBtnText));
        } catch (e) {
            console.error(e);
            alert("Could not load your account. Please refresh.");
        }
    });
});

function startPayment(user, payBtn, defaultBtnText) {
    if (typeof PaystackPop === "undefined") {
        alert("Paystack not loaded. Please refresh.");
        return;
    }

    payBtn.disabled = true;
    payBtn.textContent = "Opening secure payment…";

    const reference = `MYVAL_${Date.now()}`;

    const handler = PaystackPop.setup({
        key: CONFIG.PAYSTACK_PUBLIC_KEY,
        email: user.email,
        amount: AMOUNT_KOBO,
        currency: "NGN",
        ref: reference,

        callback: async (response) => {
            const ref = response?.reference || reference;
            payBtn.textContent = "Verifying payment…";

            try {
                const token = await firebase.auth().currentUser.getIdToken(true);
                const res = await fetch(`${API_BASE}/pay/verify?reference=${encodeURIComponent(ref)}`, {
                    method: "GET",
                    headers: { Authorization: `Bearer ${token}` }
                });

                const data = await res.json().catch(() => ({}));

                if (!res.ok || !data.success) {
                    throw new Error(data.error || data.message || "Verification failed");
                }

                alert("Payment verified ✅");
                window.location.href = "dashboard.html";
            } catch (err) {
                console.error(err);
                alert("Payment received but verification failed.\nRef: " + ref);
                payBtn.disabled = false;
                payBtn.textContent = defaultBtnText;
            }
        },

        onClose: () => {
            payBtn.disabled = false;
            payBtn.textContent = defaultBtnText;
        }
    });

    handler.openIframe();
}
