import { WalletTransactionModel } from "../models/trans.model.js";
import { User } from "../models/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import mongoose from "mongoose";


export const makePaymentWithWebhook = asyncHandler(async (req, res) => {
    try {

        const payment = req.body?.payload?.payment?.entity;

        if (!payment) {
            return res.sendStatus(200);
        }

        const paymentId = payment.id;

        const amountPaid = payment.amount / 100; // Razorpay amount in ₹

        const baseAmount = Number((amountPaid / 1.18).toFixed(2));

        if (
            req.body.event === "payment.captured" &&
            payment.status === "captured" &&
            payment.captured === true
        ) {

            console.log("PAYMENT SUCCESS");
            console.log("Payment ID:", paymentId);
            console.log("Amount:", amountPaid);
            console.log("Description:", payment.description);
            console.log("Email:", payment.email);
            console.log("Contact:", payment.contact);

            const session = await mongoose.startSession();

            try {

                await session.withTransaction(async () => {


                    // Prevent duplicate processing
                    const existing = await WalletTransactionModel.findOne({
                        paymentId
                    }).session(session);

                    if (existing) {
                        console.log("Already processed");
                        throw new Error("ALREADY_PROCESSED");
                    }

                    let userId = payment.notes.userId;

                    const user = await User.findById(userId, { name: 1, walletAmount: 1 }).session(session);

                    console.log(`User -> ${user}`);


                    // Wallet Recharge
                    if (payment.notes.type === "wallet") {

                        /* 
                        Normal Flow 
                        await User.findByIdAndUpdate(
                             payment.notes.userId,
                             {
                                 $inc: {
                                     walletAmount: baseAmount
                                 }
                             },
                             { new: true }
                         );
         
                         const transaction =
                             await WalletTransactionModel.create({
                                 userId: payment.notes.userId,
                                 paymentId,
                                 amount: baseAmount,
                                 status: "success"
                             });
         
                         console.log(
                             "Wallet credited successfully",
                             transaction._id
                         );
                         */

                        // 1. Check if eligible for the 51 bonus
                        let bonus = 0;
                        if (baseAmount >= 99) {
                            // .exists() is faster than .findOne() as it only checks if a record matches
                            const hasRechargedBefore = await WalletTransactionModel.exists({
                                userId,
                                status: "success",
                                transactionType: "recharge",
                                amount: { $gte: 99 }
                            }).session(session);

                            if (!hasRechargedBefore) bonus = 51;
                        }

                        // 2. Update user wallet
                        user.walletAmount = (parseFloat(user.walletAmount) || 0) + baseAmount + bonus;
                        await user.save({ session });

                        const rechargeTransaction =
                            await WalletTransactionModel.create([{
                                userId,
                                paymentId,
                                status: "success",
                                amount: baseAmount,
                                transactionType: "recharge"
                            }], { session });

                        if (bonus > 0) {
                            const bonusTransaction =
                                await WalletTransactionModel.create([{
                                    userId,
                                    status: "success",
                                    amount: bonus,
                                    transactionType: "bonus"
                                }], { session });

                            console.log("Bonus credited successfully",
                                bonusTransaction);

                        }

                        console.log(
                            "Wallet credited successfully",
                            rechargeTransaction
                        );
                    }

                    // Pooja Booking
                    else if (payment.notes?.type === "pooja") {

                        // Example:
                        // await PoojaBooking.findByIdAndUpdate(
                        //     notes.bookingId,
                        //     {
                        //         paymentStatus: "paid"
                        //     }
                        // );

                        console.log(
                            "Pooja payment successful",
                            payment.notes.bookingId
                        );
                    }
                })

            } catch (error) {

                if (error.code === 11000 || error.message === "ALREADY_PROCESSED") {
                    console.log("Payment already processed");
                    return res.sendStatus(200);
                }

                throw error;

            } finally {

                await session.endSession();

            }

        }

        return res.sendStatus(200);

    } catch (error) {
        console.error("Webhook Error:", error);
        return res.sendStatus(500);
    }
});