import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Stub for finance-related functions (Commissions, Payouts, TCS)
export const monthlyGMVCommissionJob = functions.pubsub.schedule('1 of month 00:00').onRun(async (context) => {
  // Logic to compute cross-platform GMV bonus
  console.log('Running monthly GMV commission job');
  return null;
});

export const calculateCommissionsTrigger = functions.firestore
  .document('orders/{orderId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();

    // Only process when order is marked 'delivered' and wasn't before
    if (before.orderStatus !== 'delivered' && after.orderStatus === 'delivered') {
      const orderId = after.orderId;
      const items = after.items || [];
      
      const db = admin.firestore();

      // For MVP, flat 2% commission of subtotal (excluding tax)
      const COMMISSION_RATE = 0.02;
      // 5% TDS under India Tax laws for Commission (194H approximation)
      const TDS_RATE = 0.05;

      // Map vendor subtotal from the cart's exact state
      const vendorTotals: Record<string, number> = {};
      for(const item of items) {
         vendorTotals[item.vendorId] = (vendorTotals[item.vendorId] || 0) + (item.price * item.qty);
      }

      try {
        await db.runTransaction(async (t) => {
          for (const [vendorId, totalSales] of Object.entries(vendorTotals)) {
            const vendorRef = db.collection('vendors').doc(vendorId);
            const vendorSnap = await t.get(vendorRef);
            if (!vendorSnap.exists) continue;
            
            const vendorData = vendorSnap.data();
            const agentId = vendorData?.referredByAgentId;
            
            if (agentId) {
              const grossCommission = totalSales * COMMISSION_RATE;
              const tdsAmount = grossCommission * TDS_RATE;
              const netCommission = grossCommission - tdsAmount;

              const ledgerId = `LED-${orderId}-${vendorId}`;
              const ledgerRef = db.collection('agentCommissions').doc(ledgerId);
              
              t.set(ledgerRef, {
                ledgerId,
                agentId,
                vendorId,
                orderId,
                totalSales,
                commissionRate: COMMISSION_RATE,
                grossCommission,
                tdsRate: TDS_RATE,
                tdsAmount,
                netCommission,
                status: 'pending_payout',
                createdAt: admin.firestore.FieldValue.serverTimestamp()
              });

              // Securely increment agent stat counts using server-side math
              const agentRef = db.collection('agents').doc(agentId);
              const agentSnap = await t.get(agentRef);
              if (agentSnap.exists) {
                t.update(agentRef, {
                  'stats.commissionEarnedTotal': admin.firestore.FieldValue.increment(netCommission)
                });
              }
            }
          }
        });
        
        console.log(`Commissions successfully calculated & ledgers created for Order ${orderId}`);
      } catch (err) {
        console.error(`Failed to process commissions for Order ${orderId}`, err);
      }
    }
  });

export const processVendorSettlementTrigger = functions.firestore
  .document('orders/{orderId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();

    // Trigger on delivered
    if (before.orderStatus !== 'delivered' && after.orderStatus === 'delivered') {
      const orderId = after.orderId;
      const items = after.items || [];
      const db = admin.firestore();

      // Platform commission rate against Vendor
      const PLATFORM_FEE_RATE = 0.05;
      // TCS under Section 52 of GST Act (1% of net taxable supply)
      const TCS_RATE = 0.01;
      // IT TDS under Section 194O (0.1% of Gross Sales post-Oct 2024 compliance)
      const TDS_194O_RATE = 0.001;

      // Group by vendor
      const vendorData: Record<string, { totalSales: number, totalGST: number }> = {};
      for(const item of items) {
         if (!vendorData[item.vendorId]) vendorData[item.vendorId] = { totalSales: 0, totalGST: 0 };
         const itemGross = item.price * item.qty;
         const itemTax = itemGross * (item.gstRate / 100);
         vendorData[item.vendorId].totalSales += itemGross;
         vendorData[item.vendorId].totalGST += itemTax;
      }

      try {
        await db.runTransaction(async (t) => {
          for (const [vendorId, data] of Object.entries(vendorData)) {
            // Net Taxable Supply is Gross Sales EXCLUDING GST
            const netTaxableSupply = data.totalSales; 
            
            // Platform Fee
            const platformFee = netTaxableSupply * PLATFORM_FEE_RATE;
            // E-commerce Operator strictly collects 1% TCS
            const tcsAmount = netTaxableSupply * TCS_RATE;
            // E-commerce Operator extracts 194O TDS on Gross Value (inclusive of GST depending on strict interpretation, but standard practice often pegs it against gross item value. We will use netTaxableSupply roughly here, but officially CBDT states Gross amount of sales. Let's use totalSales + totalGST for strict compliance).
            const grossValue = data.totalSales + data.totalGST;
            const tds194oAmount = grossValue * TDS_194O_RATE;

            // Settlement Amount = Gross Value - Platform Fee - TCS - IT TDS
            const settlementAmount = grossValue - platformFee - tcsAmount - tds194oAmount;

            const settlementId = `SETTLE-${orderId}-${vendorId}`;
            const settlementRef = db.collection('vendorSettlements').doc(settlementId);

            t.set(settlementRef, {
              settlementId,
              orderId,
              vendorId,
              grossSales: data.totalSales,
              gstCollected: data.totalGST,
              grossValue,
              netTaxableSupply,
              platformFeeRate: PLATFORM_FEE_RATE,
              platformFeeAmount: platformFee,
              tcsRate: TCS_RATE,
              tcsAmount,
              tds194oRate: TDS_194O_RATE,
              tds194oAmount,
              netSettlementAmount: settlementAmount,
              status: 'pending_transfer',
              createdAt: admin.firestore.FieldValue.serverTimestamp()
            });

            // Write detached TDS 194O Ledger record
            const tdsLedgerId = `TDS-${orderId}-${vendorId}`;
            const tdsRef = db.collection('tdsLedger').doc(tdsLedgerId);
            t.set(tdsRef, {
              tdsLedgerId,
              vendorId,
              orderId,
              grossValueDeductedAgainst: grossValue,
              tdsSection: '194O',
              tdsRate: TDS_194O_RATE,
              tdsAmountDeducted: tds194oAmount,
              createdAt: admin.firestore.FieldValue.serverTimestamp()
            });

            // Update Vendor stats
             const vendorRef = db.collection('vendors').doc(vendorId);
             const vendorSnap = await t.get(vendorRef);
             if (vendorSnap.exists) {
                t.update(vendorRef, {
                   totalRevenue: admin.firestore.FieldValue.increment(settlementAmount)
                });
             }
          }
        });

        console.log(`Vendor settlements processed for Order ${orderId}`);
      } catch (err) {
        console.error(`Failed to process vendor settlements for Order ${orderId}`, err);
      }
    }
  });
