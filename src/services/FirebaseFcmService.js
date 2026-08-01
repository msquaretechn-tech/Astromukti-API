import { JWT } from "google-auth-library";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const SCOPES = ['https://www.googleapis.com/auth/cloud-platform'];

const key = {
    "type": "service_account",
    "project_id": "jyotish-49331",
    "private_key_id": "aca75d03d0b98656741d9cd2c8f38bd80cdaf97d",
    "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCsllMbV98uZw9q\na4MC/QBb4fOIU3ZUExBrmV6nleqrMjTzJADP1o2mlg/JMx6hUQD5FkVdvb+QgVS6\n18GWZkvcp/FvFN9HTBrQPcEHcXcDyaWxrgXkbBqR95hARVg4XFmCgx51299Vo9ET\nTb66IIdlGJI8mKk0E4yQn8RRiG/nE0rYT8NQKN6J7+wYsFn75hTr69wyzZVNlR8U\nNLQ78QCYeDsRbM9YSn9/aTlvcn9UvHQoYne7LWvBqPdYAnYKTGdHo8t1yrKNIatY\nr2YaXk2k2Sb1SB5RMZQxrJXUOfHezVkWvOB3IkKJU/kTvsjuj0Sz/u/p/Jj7vJXZ\nKsKRSU0tAgMBAAECggEAIDRIu7Bw59K5UK1RHAyjtYF7FPQl/1gzVzCeNf1Gdb1/\nneMY969cbTpRJcURMR7RZKlgNjbC+S745Yh/ChZ6j2kTJxwo8b/kvPjY/Q+SGrXU\n4kvLs6zsZFJkKZIG/TVWSoE2/N0TVoKj78sxDMAnI5krKH2ADUSclRwK4P/piZ+E\nJoR3HJcQGUDjrBut0aUWBzY118KEKdxyTOQq1FBDFWKmVn0NuVBp/Of64b4e5sfF\nUkY75wm8lIl5boj24bcCkylH0DpBYxXOZrGQOEOHWOiLT8MgC4Fcufn+K/1YKTg4\nE7KeFe5oNGC6F+tm+nvmZ1PKjmK28YFD9sr1wjlqjQKBgQDnlVdTH37DpsXJGIYG\nGtoMkupm7XG5Dyxw04s1DsfxKPt7ZRIZTRKOblBS6FBuD76ULvbihosN2+xZ2UyR\nASuf6eqt4c1QTnteQooWcyLao50im+wMogsTeVeXFgK72cPc+b/J0xkvpTmqp7hu\neLOs+m/gNjPiYeoF36siWfOTwwKBgQC+yJ7D8fwhXsd6IJr+wVrrDhQWi8B4UZJQ\nkQnMXtBFg9cwUL1Y0VVjpuaJwT7RLBD8QUZGZ6hXRs5OEl6c3MrcNm7tMHgFtcJX\noG97SHLz+Bav9VQeRe2pniDzUEKjQvjrgQRWCbNo3u77/exgaHEVaCn5Z27A8AYS\nHn1//r88TwKBgQDOmqmBewO4wTyLH9nR8Hq/5QJCOWvP0f2v2srC1yEBwbI6b/0p\nnV0EvN3kWWYICvvXb97KUYYVIzNFJVvtscGdtS6tWlm1X48olOxlAusBbB5wFfMN\ngjOneAXwwK5HsQvQRPAZur8phppf6ancxMpndDYDLdg0C26hNt6SkvV/yQKBgQCI\n8jNczd/BCGrB1JPNmHet0G5E/M4Mz+jqIiJZbBmuPIQD74DrN2BG5vAHJAr2VN5g\nZG6QbSnedDn0uqTljmujhQM9CRSubJjzE3vSj9/MFmIarkxSarm9jn9yiEM9M/6/\n9d1p8Q6ykYwUoGHDllTOG/Y9S6ypm+GPsgk+DluxawKBgGhMWoWnwuLjBKOHKzCk\n39DpZTSD621W3kxuW0XXP5ILo+yiHNdpvckoYqGrdsSpYlymL0zkDrOGgtvRGjGf\nAV4WZJqqcXfw4MPFhXgkdIBz+IXsaLMthozCuKVDavE/UNE8LYebQTRnxer66KAH\nQ4CaanxDiSFo9C6a1XZghF0H\n-----END PRIVATE KEY-----\n",
    "client_email": "firebase-adminsdk-7tvsy@jyotish-49331.iam.gserviceaccount.com",
    "client_id": "117801136392587984347",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-7tvsy%40jyotish-49331.iam.gserviceaccount.com",
    "universe_domain": "googleapis.com"
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


    const jwtClient = new JWT({
        email: key.client_email,
        key: key.private_key,
        scopes: SCOPES
    });
    jwtClient.authorize(async function (err, tokens) {
        if (err) {

            console.log(err);


            throw new ApiError(401, err)

        }
        // const accessToken = tokens.access_token;

        const accessToken = await getAccessToken();

        const uri = 'https://fcm.googleapis.com/v1/projects/jyotish-49331/messages:send';


        const targetField = fcmToken ? { token: fcmToken } : { topic: topic };


        fetch(uri, {
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
        })

            // Converting to JSON 
            .then(response => response.json())
            // Displaying results to console 
            .then((json) => {
                res.json(json)
            });

    });
})


export const sendFcmNotification = async (fcmToken, body, title, data) => {

    const jwtClient = new JWT({
        email: key.client_email,
        key: key.private_key,
        scopes: SCOPES
    });

    return new Promise((resolve, reject) => {
        jwtClient.authorize(function (err, tokens) {
            if (err) {
                reject(err);
                throw new ApiError(401, err)
            }

            const accessToken = tokens.access_token;

            const uri = 'https://fcm.googleapis.com/v1/projects/jyotish-49331/messages:send';

            fetch(uri, {
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
            })

                // Converting to JSON
                .then(response => response.json())
                // Displaying results to console
                .then((json) => {
                    resolve(json)
                });
        });
    })
}