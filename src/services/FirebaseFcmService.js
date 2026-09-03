import { JWT } from "google-auth-library";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const SCOPES = ['https://www.googleapis.com/auth/cloud-platform'];

const key = {
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
}

/*
// For Generate Access Token 
export const generateAccessToken = asyncHandler(async (req, res) => {

    const jwtClient = new JWT(
        key.client_email,
        null,
        key.private_key,
        SCOPES,
        null
    );

    jwtClient.authorize(function (err, tokens) {
        if (err) {
            console.log(err);
            throw new ApiError(401, err)
        }
        return res.send(tokens.access_token);
    });

})
*/

// ----------------- TOKEN CACHE -----------------
let cachedAccessToken = null;
let cachedExpiry = 0;

async function getAccessToken() {
    if (cachedAccessToken && Date.now() < cachedExpiry) {
        return cachedAccessToken;
    }

    const jwtClient = new JWT({
        email: key.client_email,
        key: key.private_key,
        scopes: SCOPES
    });

    const tokens = await jwtClient.authorize();
    cachedAccessToken = tokens.access_token;
    cachedExpiry = Date.now() + (tokens.expiry_date - Date.now()) - 60000; // refresh 1 min early

    return cachedAccessToken;
}

// ----------------- GENERATE ACCESS TOKEN (debug use only) -----------------
export const generateAccessToken = asyncHandler(async (req, res) => {
    const token = await getAccessToken();
    res.send(token);
});


// For Sending Notification 
export const sendNotification = asyncHandler(async (req, res) => {

    const { fcmToken, topic, channel_id, sound, body, title, data } = req.body;


    if (!fcmToken && !topic) {
        throw new ApiError(400, "Either fcmToken or topic is required")
    }

    const accessToken = await getAccessToken();

    const uri = 'https://fcm.googleapis.com/v1/projects/jyotish-49331/messages:send';

    const targetField = fcmToken ? { token: fcmToken } : { topic: topic };

    const response = await fetch(uri, {
        method: "POST",
        body: JSON.stringify({
            message: {
                ...targetField,
                notification: {
                    body: body,
                    title: title
                },
                android: {
                    priority: "high",
                    notification: {
                        "channel_id": channel_id,
                        "sound": sound,
                    }
                },
                apns: {
                    headers: {
                        "apns-priority": "10"
                    },
                    payload: {
                        aps: {
                            "sound": sound,
                        }
                    }
                },
                data: {
                    ...data,
                    title: title,   // ✅ always included
                    body: body      // ✅ always included
                },
            }
        }),
        headers: {
            "Content-type": "application/json",
            "Authorization": `Bearer ${accessToken}`
        }
    });

    const json = await response.json();
    return res.json(json);
})


export const sendFcmNotification = async (fcmToken, body, title, data) => {
    const accessToken = await getAccessToken();

    const uri = 'https://fcm.googleapis.com/v1/projects/jyotish-49331/messages:send';

    const response = await fetch(uri, {
        method: "POST",
        body: JSON.stringify({
            message: {
                token: fcmToken,
                notification: {
                    body: body,
                    title: title
                },
                android: {
                    priority: "high",
                    notification: {
                        sound: "default"
                    }
                },
                apns: {
                    headers: {
                        "apns-priority": "10"
                    },
                    payload: {

                        aps: {
                            sound: "default"
                        }
                    }
                },
                data: data // Optional: { type: "chat", chatroomId: "123" }
            }
        }),
        headers: {
            "Content-type": "application/json",
            "Authorization": `Bearer ${accessToken}`
        }
    });

    return response.json();
}