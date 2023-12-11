const fetch = require('node-fetch');
const crypto = require('crypto');
const http = require('http');
const url = require('url');
const opn = require('opn');
const LocalStorage = require('node-localstorage').LocalStorage;

const localStorage = new LocalStorage('./scratch');

// import { env } from "~/env.mjs";
// const clientId = env.SPOTIFY_CLIENT_ID_TOP_TRACKS

const APIController = (async function () {
    const clientId = 'c847b23c498f4901a6bea7503bee4705';
    const redirectUri = 'http://localhost:8081';

    const generateRandomString = (length) => {
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        const values = crypto.randomBytes(length);
        return values.reduce((acc, x) => acc + possible[x % possible.length], "");
    }

    const codeVerifier = generateRandomString(64);

    const sha256 = async (plain) => {
        const encoder = new TextEncoder();
        const data = encoder.encode(plain);
        return crypto.createHash('sha256').update(data).digest();
    }

    const base64encode = (input) => {
        return Buffer.from(input).toString('base64')
            .replace(/=/g, '')
            .replace(/\+/g, '-')
            .replace(/\//g, '_');
    }

    const hashed = await sha256(codeVerifier);
    const codeChallenge = base64encode(hashed);

    const scope = 'user-read-private user-read-email user-top-read';
    const authUrl = new URL("https://accounts.spotify.com/authorize");

    localStorage.setItem('code_verifier', codeVerifier);

    const params = {
        response_type: 'code',
        client_id: clientId,
        scope,
        code_challenge_method: 'S256',
        code_challenge: codeChallenge,
        redirect_uri: redirectUri,
    }

    authUrl.search = new URLSearchParams(params).toString();
    console.log('Opening the Spotify authorization URL in your default web browser...');
    await opn(authUrl.toString()); // Open the Spotify authorization URL in the default web browser

    const server = http.createServer(async (req, res) => {
        const query = url.parse(req.url, true).query;
        const code = query.code;

        if (code) {
            await getToken(code);
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end('<h1>Authorization Successful</h1><p>You can close this window.</p>');
            server.close();
        } else {
            res.writeHead(400, { 'Content-Type': 'text/html' });
            res.end('<h1>Authorization Code Missing</h1><p>Please provide the authorization code.</p>');
        }
    });

    server.listen(8081, () => {
        console.log('Authorization server running at http://localhost:8081/');
    });

    async function getToken(code) {
        let codeVerifier = localStorage.getItem('code_verifier');

        const payload = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                client_id: clientId,
                grant_type: 'authorization_code',
                code,
                redirect_uri: redirectUri,
                code_verifier: codeVerifier,
            }),
        }

        const response = await fetch('https://accounts.spotify.com/api/token', payload);
        const responseBody = await response.json();

        localStorage.setItem('access_token', responseBody.access_token);

        // Call getTopTracks after obtaining the access token
        await getTopTracks();
    }

    async function getTopTracks() {
        const token = localStorage.getItem('access_token');

        const response = await fetch('https://api.spotify.com/v1/me/top/tracks?time_range=short_term&limit=10', {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        const responseBody = await response.json();

        const simplifiedTracks = responseBody.items.map(({ external_urls, preview_url, id, name, duration_ms }) => ({
            external_urls,
            preview_url,
            id,
            name,
            duration_ms
        }));

        console.log('Top Tracks:', simplifiedTracks);
    }

    return {
        async startAuthorizationServer() {
            // Placeholder for the startAuthorizationServer function
            console.log('Authorization server started');
        },
        async getTopTracks() {
            return await getTopTracks();
        }
    };
})();

async function testAPIController() {
    try {
        await APIController.startAuthorizationServer();

        // Call getTopTracks to fetch and display the top tracks
        await APIController.getTopTracks();
    } catch (error) {
        console.error('Error:', error);
    }
}

// Call the test function
testAPIController();

