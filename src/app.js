import express from "express";
import { errorHandler } from "./middlewares/error.middelwares.js";
import { generateChatToken, generateRtcToken } from "./services/AgoraTokenGenerator.js";
import { generateAccessToken, sendNotification } from "./services/FirebaseFcmService.js";

const app = express();
import cors from "cors";

const allowedOrigins = [
    "https://www.astromukti.com",
    "https://astromukti.com",
];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error("Not allowed by CORS"));
        }
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: false
}));


// middlewares
app.use(express.json({ limit: "16mb" }));
app.use(express.urlencoded({ extended: true, limit: "16mb" }));
// app.use(express.static("public"));
app.use('/', express.static('public'));
app.use('/images', express.static('../public/images'));
app.use('/icons', express.static('../public/icons'));

/// import routes 
import authRouter from "./routes/auth.routes.js";
import vendorRouter from "./routes/vendor.routes.js";
import userRouter from "./routes/user.routes.js";
import blogRouter from "./routes/blog.routes.js";
import videoRouter from "./routes/video.routes.js";
import transRouter from "./routes/trans.routes.js";
import bannerRouter from "./routes/banner.routes.js";
import chatRouter from "./routes/chat.routes.js";
import messageRouter from "./routes/message.routes.js";
import giftRouter from "./routes/gift.routes.js";
import dashboardRouter from "./routes/dashboard.routes.js"
import categoryRouter from "./routes/category.routes.js"
import productRouter from "./routes/product.routes.js"
import orderRouter from "./routes/order.routes.js"
import poojaRouter from "./routes/pooja.routes.js"
import couponRouter from "./routes/coupon.routes.js"
import cartRouter from "./routes/cart.routes.js"
import enquiryRouter from "./routes/enquiry.routes.js"
import appSettingsRouter from "./routes/appSettings.routes.js"
import { makePaymentWithWebhook } from "./services/PaymentWebhookService.js";





/// app routes 
app.use('/api/auth', authRouter)
app.use('/api/vendor', vendorRouter)
app.use('/api/user', userRouter)
app.use('/api/blog', blogRouter)
app.use('/api/video', videoRouter)
app.use('/api/transaction', transRouter)
app.use('/api/banner', bannerRouter)
app.use('/api/chat', chatRouter)
app.use('/api/message', messageRouter)
app.use('/api/gift', giftRouter)
app.use('/api/dashboard', dashboardRouter)
app.use('/api/category', categoryRouter)
app.use('/api/product', productRouter)
app.use('/api/order', orderRouter)
app.use('/api/pooja', poojaRouter)
app.use('/api/coupon', couponRouter)
app.use('/api/cart', cartRouter)
app.use('/api/enquiry', enquiryRouter)
app.use('/api/settings', appSettingsRouter)



app.get("/", (req, res) => {
    res.send("Server running");
});
app.get("/generate-rtc-token/:channel/:role/:tokentype/:uid", generateRtcToken);
app.get("/generate-chat-token/:username", generateChatToken);
app.get("/generate-firebase-token/", generateAccessToken);
app.post("/api/send-notification", sendNotification);


// RAZOR PAY WEBHOOK 
app.post("/api/razorpay/webhook", makePaymentWithWebhook);

// common error handling middleware
app.use(errorHandler);


export default app;