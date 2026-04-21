import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Assign default customer role on signup
export const setDefaultCustomerRoleOnSignup = functions.auth.user().onCreate(async (user) => {
  try {
    await admin.auth().setCustomUserClaims(user.uid, { role: 'customer' });
    
    // Create initial user document
    await admin.firestore().collection('users').doc(user.uid).set({
      uid: user.uid,
      role: 'customer',
      email: user.email || null,
      phone: user.phoneNumber || null,
      fullName: user.displayName || '',
      photoURL: user.photoURL || null,
      isEmailVerified: user.emailVerified || false,
      status: 'active',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    console.log(`Assigned default customer role for user ${user.uid}`);
  } catch (error) {
    console.error('Error assigning default customer role:', error);
  }
});

// Admin approves Agent Application
export const assignAgentRoleOnApproval = functions.firestore
  .document('agentApplications/{appId}')
  .onUpdate(async (change, context) => {
    const beforeData = change.before.data();
    const afterData = change.after.data();

    // Check if status transitioned to "approved"
    if (beforeData.status !== 'approved' && afterData.status === 'approved') {
      const uid = afterData.uid;
      
      try {
        // Set Custom Claim
        await admin.auth().setCustomUserClaims(uid, { role: 'agent' });
        
        // Update user config
        await admin.firestore().collection('users').doc(uid).update({
          role: 'agent',
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        const agentCode = `AGT-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

        // Create the core agent record
        await admin.firestore().collection('agents').doc(uid).set({
          agentId: uid,
          uid: uid,
          agentCode: agentCode,
          fullName: afterData.fullName,
          phone: afterData.phone,
          email: afterData.email,
          territories: afterData.territoryCodes || [],
          status: 'active',
          joinedAt: admin.firestore.FieldValue.serverTimestamp(),
          approvedAt: admin.firestore.FieldValue.serverTimestamp(),
          approvedBy: afterData.reviewedBy || 'system',
          stats: {
            vendorLeadsCount: 0,
            customerLeadsCount: 0,
            commissionEarnedTotal: 0
          }
        });

        console.log(`Agent role assigned and profile created for ${uid}`);
      } catch (err) {
        console.error(`Failed to assign agent role for ${uid}`, err);
      }
    }
  });

// Admin approves Vendor Application
export const assignVendorRoleOnApproval = functions.firestore
  .document('vendorApplications/{appId}')
  .onUpdate(async (change, context) => {
    const beforeData = change.before.data();
    const afterData = change.after.data();

    if (beforeData.status !== 'approved' && afterData.status === 'approved') {
      const uid = afterData.uid;

      try {
        // Set Custom Claim
        await admin.auth().setCustomUserClaims(uid, { role: 'vendor' });

        // Update user config
        await admin.firestore().collection('users').doc(uid).update({
          role: 'vendor',
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        const storeSlug = afterData.businessName.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Math.random().toString(36).substr(2, 4);

        // Create Vendor Master record
        await admin.firestore().collection('vendors').doc(uid).set({
          vendorId: uid,
          uid: uid,
          businessName: afterData.businessName,
          ownerName: afterData.ownerName,
          storeSlug: storeSlug,
          email: afterData.email,
          phone: afterData.phone,
          gstin: afterData.gstin,
          businessType: afterData.businessType,
          pickupAddress: afterData.pickupAddress,
          status: 'active',
          subscriptionStatus: 'trial',
          approvedAt: admin.firestore.FieldValue.serverTimestamp(),
          approvedBy: afterData.reviewedBy || 'system',
          referredByAgentId: afterData.referredByAgentId || null,
          totalProducts: 0,
          totalRevenue: 0,
        });

        console.log(`Vendor role assigned logic triggered for ${uid}`);

      } catch (err) {
        console.error(`Failed to assign vendor role for ${uid}`, err);
      }
    }
  });
