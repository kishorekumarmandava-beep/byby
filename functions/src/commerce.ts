import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

export const verifyPaymentAndMarkPaid = functions.https.onCall(async (data, context) => {
  const uid = context.auth?.uid;
  if (!uid) throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');

  const { orderId, transactionId } = data;
  if (!orderId || !transactionId) throw new functions.https.HttpsError('invalid-argument', 'Missing fields');

  const orderRef = admin.firestore().collection('orders').doc(orderId);
  const txRef = admin.firestore().collection('paymentTransactions').doc(transactionId);

  await admin.firestore().runTransaction(async (t) => {
    const orderSnap = await t.get(orderRef);
    const txSnap = await t.get(txRef);

    if (!orderSnap.exists) throw new functions.https.HttpsError('not-found', 'Order not found');
    if (!txSnap.exists) throw new functions.https.HttpsError('not-found', 'Transaction not found');
    
    const txData = txSnap.data()!;
    if (txData.status !== 'success') {
      throw new functions.https.HttpsError('failed-precondition', 'Payment not successful');
    }

    t.update(orderRef, {
      paymentStatus: 'paid',
      orderStatus: 'processing',
      paidAt: admin.firestore.FieldValue.serverTimestamp()
    });
  });

  return { success: true, message: "Order payment verified and locked." };
});
