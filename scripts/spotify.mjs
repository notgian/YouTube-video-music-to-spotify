import axios from "axios";
import querystring from "qs";

const tokenType = {
    'clientCredentials': 'client_credentials',
    'authorizationCode': 'authorization_code'
}

// exceptions

class SpotifyRequestError extends Error {
    constructor(message) {
        super(message);
        this.name = this.constructor.name
    }
}

class TokenExpiredError extends SpotifyRequestError {
    constructor(message) {
        super(message);
        this.name = this.constructor.name
    }
}

// Token related methods

async function getToken(type, clientID, clientSecret, options={} ) {
    // 2 possible types: tokenType.clientCredentials || tokenType.authorization
    // Possible options: code (for auth_code); redirect_uri (for auth_code)

    function getTokenData(type, options={}){
        if (type == tokenType.clientCredentials) {
            return {
                'grant_type': tokenType.clientCredentials
            }
        }
        else if (type == tokenType.authorizationCode) {
            let missing = []
            if (!('code' in options)) missing.push('code')
            if (!('redirect_uri' in options)) missing.push('redirect_uri')
    
            if (missing.length > 0) {
                throw Error(`Missing options required for token type ${type}: ${missing.toString()}`)
            }
    
            return {
                'grant_type': tokenType.authorizationCode,
                'code': options['code'],
                'redirect_uri': options['redirect_uri']
            }
        }
    }

    const url = 'https://accounts.spotify.com/api/token';
    const headers = {
        "Authorization": "Basic " + (new Buffer.from(clientID + ':' + clientSecret).toString('base64')),
        "Content-Type": "application/x-www-form-urlencoded"
    };

    const body = getTokenData(type, options);

    const req = await axios.post(url, querystring.stringify(body), {headers:headers});

    if (req.status != 200) {
        return ('Token request failed with status code ' + req.status);
    }
    
    const data = req.data;
    return data;

}

async function refreshAccessToken(refreshToken, clientID, clientSecret) {
    const body = {
        'grant_type':'refresh_token',
        'refresh_token': refreshToken
    }

    const headers = {
        'Authorization': "Basic " + (new Buffer.from(clientID + ':' + clientSecret).toString('base64')),
        "Content-Type": "application/x-www-form-urlencoded"
    }

    const req = await axios.post('https://accounts.spotify.com/api/token', querystring.stringify(body), {headers:headers})

    if (req.status != 200) {
        return ('Token refresh request failed with status code ' + req.status);
    }

    return req.data
}

// General Methods that only require auth type of client credentials 

function requestAuthHeader(token, options={}){
    let baseHeader = {'Authorization': "Bearer " + token}
    for (let key in options){
        baseHeader[key] = options[key]
    }
    return baseHeader;
}

async function spotifySearch(token, searchQuery, options={}) {
    const url = 'https://api.spotify.com/v1/search';
    const headers = requestAuthHeader(token);

    // For Readability: Default options -> type=track, limit=1, offset = 0

    const URLQueryString = querystring.stringify({
        'q':searchQuery,
        'type': 'type' in options ? options['type'] : 'track',
        'limit': 'limit' in options ? options['limit'] : 1,
        'offset': 'offset' in options ? options['offset'] : 0,
    });
    const urlQuery = url+'?'+URLQueryString;

    const req = await axios.get(urlQuery, {headers:headers});
    if (req.status != 200) {
        return Error('Search request failed with status code ' + req.status)
    };

    return req.data;
}

// Methods that require user authentication

async function getCurrentUserProfile(token) {
    const url = "https://api.spotify.com/v1/me";
    const headers = requestAuthHeader(token);

    const req = await axios.get(url, {headers:headers});

    if (req.status != 200) {
        throw Error(`get current user profile failed with status code ${req.status}`);
    }

    return req.data;
}

async function createUserPlaylist(token, userID, playlistName, playlistDescription, playlistPublic=true, playlistCollaborative=false) {
    const url = `https://api.spotify.com/v1/users/${userID}/playlists`;
    const headers = requestAuthHeader(token, {'Content-Type':'application/json'});

    const body = {
        "name": playlistName,
        "description": playlistDescription,
        "public": playlistPublic,
        "collaborative": playlistCollaborative
    };

    const req = await axios.post(url, body, {headers:headers, data:body})

    return req

}

function playlistIDFromLink(playlistLink) {
    const validSpotifyPlaylistPattern = /(https)?(:\/\/)?(open\.spotify\.com)\/(playlist)\/.+/;
    if (!playlistLink.search(validSpotifyPlaylistPattern) == -1) {
        console.log('not a playlist link')
        return undefined;
    };

    const getPlaylistIDPattern = /playlist\/[a-zA-Z0-9]+/;
    const playlistIDMatch = playlistLink.match(getPlaylistIDPattern);
    if (playlistLink.match(getPlaylistIDPattern) == null) {
        console.log('no id found for some reason...')
        return undefined;
    };

    return playlistIDMatch[0].substring(9);
}

async function addItemsToUserPlaylist(token, playlistID, items=[], options={}){
    // items: [track uris]

    if (!Array.isArray(items)) {
        throw TypeError('\"items\" should be an array of URIs')
    }

    if (items.length == 0) {
        throw Error('there should be at least one item passed into the \"items\" arra')
    }

    function isValidURI(str) {
        const pattern = /(spotify):(track):[\w]+/
        if (str.search(pattern) == -1) {
            return false
        }
        return true
    }

    const ignoreInvalidURIs = 'ignoreInvalidURIs' in options ? options['ignoreInvalidURIs'] : true

    let validURIs = []
    let invalidURIs = []

    items.forEach( item => {
        if (isValidURI(item)) validURIs.push(item);
        else invalidURIs.push(item)
    })

    if (invalidURIs != []) {
        if (validURIs == []) {
            throw Error('None of the URIs passed are valid')
        }

        if (ignoreInvalidURIs) {
            console.log('Invalid URIs detected and will be ignored.')
            invalidURIs.forEach( uri => console.log(uri))
        }
        else {
            throw Error('Invalid URI(s) detected and have thrown an error.')
        }
        
    }

    // Request Proper

    const url = `https://api.spotify.com/v1/playlists/${playlistID}/tracks`;
    const headers = requestAuthHeader(token, {'Content-Type':'application/json'});

    const body = {
        "uris": validURIs,
        "position": 'position' in options ? options['position'] : 0
    }


    const req = await axios.post(url, body, {headers:headers})
    return req
}

export {
    tokenType, 
    getToken, 
    refreshAccessToken,
    spotifySearch, 
    getCurrentUserProfile, 
    createUserPlaylist, 
    playlistIDFromLink, 
    addItemsToUserPlaylist
}