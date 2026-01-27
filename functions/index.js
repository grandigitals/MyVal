/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

/*const {setGlobalOptions} = require("firebase-functions");
const {onRequest} = require("firebase-functions/https");
const logger = require("firebase-functions/logger");

// For cost control, you can set the maximum number of containers that can be
// running at the same time. This helps mitigate the impact of unexpected
// traffic spikes by instead downgrading performance. This limit is a
// per-function limit. You can override the limit for each function using the
// `maxInstances` option in the function's options, e.g.
// `onRequest({ maxInstances: 5 }, (req, res) => { ... })`.
// NOTE: setGlobalOptions does not apply to functions using the v1 API. V1
// functions should each use functions.runWith({ maxInstances: 10 }) instead.
// In the v1 API, each function can only serve one request per container, so
// this will be the maximum concurrent request count.
setGlobalOptions({ maxInstances: 10 });

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

// exports.helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });
*/

const functions = require('firebase-functions');
const fetch = require('node-fetch');

exports.startPayment = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated');
    }

    const email = context.auth.token.email;

    const response = await fetch(
        'https://api.paystack.co/transaction/initialize',
        {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${functions.config().paystack.secret}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email,
                amount: 200000,
                callback_url: 'https://myval.buzz/dashboard.html',
                metadata: {
                    uid: context.auth.uid
                }
            })
        }
    );

    const result = await response.json();

    return {
        authorization_url: result.data.authorization_url
    };
});
