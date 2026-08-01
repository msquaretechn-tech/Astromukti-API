import agoraToken from 'agora-token';
const { RtcTokenBuilder, RtcRole, ChatTokenBuilder, RtmTokenBuilder } = agoraToken;
import { asyncHandler } from "../utils/asyncHandler.js";
import https from 'https';

/// RTC Token for CALL ( VIDEO/AUDIO )
export const generateRtcToken = asyncHandler(async (req, res) => {

    const { appId, appCertificate } = req.query;

    if (!appId || !appCertificate) {
        return res.status(400).json({ 'error': 'appId and appCertificate are required' });
    }

    const channelName = req.params.channel;
    if (!channelName) {
        return res.status(400).json({ 'error': 'channel is required' });
    }

    const uid = req.params.uid;
    if (!uid || uid === '') {
        return res.status(400).json({ 'error': 'uid is required' });
    }

    let role;
    const userRole = req.params.role;

    if (userRole === 'publisher') {
        role = RtcRole.PUBLISHER;
    } else if (userRole === 'audience') {
        role = RtcRole.SUBSCRIBER;
    } else {
        return res.status(400).json({ 'error': 'role is incorrect' });
    }

    let expireTime = req.query.expiry;
    if (!expireTime || expireTime === '') {
        expireTime = 3600; // Default to 1 hour
    } else {
        expireTime = parseInt(expireTime, 10);
    }

    const currentTime = Math.floor(Date.now() / 1000);
    const privilegeExpireTime = currentTime + expireTime;

    let token;
    const tokenType = req.params.tokentype;

    if (tokenType === 'userAccount') {
        token = RtcTokenBuilder.buildTokenWithUserAccount(appId, appCertificate, channelName, uid, role, privilegeExpireTime);
    } else if (tokenType === 'uid') {
        token = RtcTokenBuilder.buildTokenWithUid(appId, appCertificate, channelName, uid, role, privilegeExpireTime);
    } else {
        return res.status(400).json({ 'error': 'token type is invalid' });
    }

    res.header('Access-Control-Allow-Origin', '*');
    res.json({ 'rtcToken': token });

})

/// TOKEN FOR CHAT ( GROUP/SINGLE )
export const generateChatToken = asyncHandler(async (request, res) => {

    const { appId, appCertificate, orgName, appName } = request.query;

    let APP_ID = appId;
    let APP_CERTIFICATE = appCertificate;

    const { username } = request.params;
    console.log("Chat User name:", username);
    console.log(request.query);

    if (orgName == undefined || appName == undefined) {
        return res.json({ message: "orgName or appName is required " });
    }


    const userToken = ChatTokenBuilder.buildUserToken(APP_ID, APP_CERTIFICATE, username, 3000);

    const appToken = ChatTokenBuilder.buildAppToken(APP_ID, APP_CERTIFICATE, 3000);

    const rtmToken = RtmTokenBuilder.buildToken(APP_ID, APP_CERTIFICATE, username, 3000);

    const data = JSON.stringify({
        username: username,
        password: Date.now()
    });

    const options = {
        hostname: 'a61.chat.agora.io',
        port: 443,
        path: `/${orgName}/${appName}/users`,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${appToken}`
        }
    };

    const req = https.request(options, (res) => {
        console.log(`statusCode: ${res.statusCode}`);

        res.on('data', (d) => {
            process.stdout.write(d);
        });
    });

    req.on('error', (error) => {
        console.error(error);
    });

    req.write(data);
    req.end();

    return res.json({ userToken, appToken, rtmToken });

})