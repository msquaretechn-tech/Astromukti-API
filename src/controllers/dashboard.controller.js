import { User } from '../models/user.model.js';
import { Vendor, VendorWaiting } from '../models/vendor.model.js';
import { TransactionModel } from '../models/trans.model.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';




/// Get Dashboard Data  
export const getDahsboardData = asyncHandler(async (req, res) => {


    let [{ total_documents: totalUsers = 0 } = {}] = await User.aggregate([{ $count: "total_documents" }]);
    let [{ total_documents: totalVendors = 0 } = {}] = await Vendor.aggregate([{ $count: "total_documents" }]);
    let [{ total_amount: todayPaymentReceived = 0 } = {}] = await TransactionModel.aggregate([{ $match: { createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)), $lt: new Date(new Date().setHours(24, 0, 0, 0)) } } }, { $group: { _id: null, total_amount: { $sum: "$amount" } } }]);
    let [{ total_amount: totalPaymentReceived = 0 } = {}] = await TransactionModel.aggregate([{ $group: { _id: null, total_amount: { $sum: "$amount" } } }]);
    let [{ total_amount: totalPayout = 0 } = {}] = await TransactionModel.aggregate([{ $group: { _id: null, total_amount: { $sum: "$amount" } } }]);
    let [{ total_documents: totalOrders = 0 } = {}] = await VendorWaiting.aggregate([{ $match: { status: { $ne: "-failed" } } }, { $count: "total_documents" }]);
    let [{ total_documents: totalPendingOrders = 0 } = {}] = await VendorWaiting.aggregate([{ $match: { status: "pending" } }, { $count: "total_documents" }]);
    let [{ total_documents: totalCancelOrders = 0 } = {}] = await VendorWaiting.aggregate([{ $match: { status: "cancelled" } }, { $count: "total_documents" }]);
    let [{ total_documents: totalCompletedOrders = 0 } = {}] = await VendorWaiting.aggregate([{ $match: { status: "confirm" } }, { $count: "total_documents" }]);

    const data = {
        "totalUsers": totalUsers,
        "totalVendors": totalVendors,
        "todayPaymentReceived": todayPaymentReceived,
        "totalPaymentReceived": totalPaymentReceived,
        "totalPayout": totalPayout,
        "totalOrders": totalOrders,
        "totalPendingOrders": totalPendingOrders,
        "totalCancelOrders": totalCancelOrders,
        "totalCompletedOrders": totalCompletedOrders,
    }

    return res.json(new ApiResponse(200, data, "Dashboard data retrieved successfully"));

});

