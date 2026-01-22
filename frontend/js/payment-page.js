document.addEventListener("DOMContentLoaded", () => {
    const payBtn = document.getElementById("pay-btn");

    firebase.auth().onAuthStateChanged(async (user) => {
        if (!user) {
            window.location.href = "index.html";
            return;
        }

        const userRef = db.collection("users").doc(user.uid);
        const snap = await userRef.get();

        if (snap.exists && snap.data().is_premium) {
            window.location.href = "dashboard.html";
            return;
        }

        payBtn.addEventListener("click", () => {
            startPayment(user, userRef, payBtn);
        });
    });
});

function startPayment(user, userRef, payBtn) {
    // Prevent double clicks
    payBtn.disabled = true;
    const originalText = payBtn.textContent;
    payBtn.textContent = "Opening secure payment…";

    const handler = PaystackPop.setup({
        key: CONFIG.PAYSTACK_PUBLIC_KEY, // test key
        email: user.email,
        amount: 200000, // ₦2,000 in kobo
        currency: "NGN",
        ref: "MYVAL_" + Date.now(),

        callback: function (response) {
            payBtn.textContent = "Confirming payment…";

            userRef.update({
                is_premium: true,
                paymentRef: response.reference,
                paidAt: new Date().toISOString()
            }).then(() => {
                window.location.href = "dashboard.html";
            });
        },

        onClose: function () {
            // Reset button if user closes popup
            payBtn.disabled = false;
            payBtn.textContent = originalText;
        }
    });

    handler.openIframe();
}
