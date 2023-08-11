import express from "express";
import dotenv from "dotenv";
import generateRandomString from "./scripts/js.mjs"
import querystring from "qs";
import cookieParser from "cookie-parser";
import { createServer } from "http";
import { Server } from "socket.io";

import {tokenType, 
  getToken, 
  spotifySearch, 
  getCurrentUserProfile, 
  createUserPlaylist, 
  playlistIDFromLink, 
  addItemsToUserPlaylist, 
  refreshAccessToken} from "./scripts/spotify.mjs"
import { getVideoMusic } from "./scripts/yt-handler.mjs"

dotenv.config() 

const client_id = process.env.CLIENT_ID;
const client_secret = process.env.CLIENT_SECRET
const redirect_uri = 'http://localhost:3000/callback';

const app = express();
app.set('view engine', 'ejs')

app.use(express.static('scripts'))
app.use(cookieParser())

app.get('/login', (req, res) => {
  var state = generateRandomString(16);
  var scope = 'playlist-read-private playlist-read-collaborative playlist-modify-private playlist-modify-public user-read-private user-read-email';

  res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: client_id,
      scope: scope,
      redirect_uri: redirect_uri,
      state: state
    }));

});

app.get('/callback', async (req, res) => {
  if (req.query.hasOwnProperty('access_token')) {
    const queryTokenData = req.query
    const now = new Date()
    res.locals.tokenData = {
      access_token: queryTokenData.access_token,
      expires_on: new Date(now.getTime() + queryTokenData.expires_in * 1000).getTime(),
      refresh_token: queryTokenData.refresh_token
    }
    res.render('callback_handler.ejs', res.locals)
  }

  else {
    var code = req.query.code || null;
    var state = req.query.state || null;

    if (state === null) {
      res.redirect('/#' +
        querystring.stringify({
          error: 'state_mismatch'
        }));
    }

    else {
      const tokenData = (await getToken(tokenType.authorizationCode, client_id, client_secret, {
        code: code,
        redirect_uri: redirect_uri
      }))

      res.redirect('/callback?'+querystring.stringify(tokenData))
    }
  }
});

const router = express.Router();
app.use('/', router);
router.use(express.json()); 
router.use(express.urlencoded()); 


router.route('/')
  .get( (req, res) => {
  
    res.render('index')
  })
  .post( async (req, res) => {
    const formData = req.body
    const cookies = req.cookies

    console.log(formData)

    const info = await getVideoMusic(formData['youtube-url'])
    res.send(info)
    // res.redirect(200, '/')
  })


const httpServer = createServer(app);
const io = new Server(httpServer)

io.on('connect', (socket) => {
  socket.on('getMusic', async (data, callback) => {
    function getPlaylistName(playlistUrl, playlistNameField, videoTitle) {
      if (playlistUrl == null) {
        if (playlistNameField == '') return videoTitle;
        else return playlistNameField;
      }
      return videoTitle;
    }

    const youtubeUrl = data['youtube-url'];
    const videoInformation = await getVideoMusic(youtubeUrl);

    const playlistUrl = data['playlist-url'] == '' ? null : data['playlist-url'];
    const playlistName = getPlaylistName(playlistUrl, data['playlist-name'], videoInformation.title);

    var songsSpotify = Array()
    
    const searchTokenData = await getToken(tokenType.clientCredentials, client_id, client_secret)

    for (let song of videoInformation.songs) {
      const spotifySong = await spotifySearch(searchTokenData.access_token, song.song_name + ' ' + song.artist)
      songsSpotify.push(spotifySong)
    }

    callback({
      youtube_songs: videoInformation.songs,
      spotify_songs: songsSpotify,
      playlist_name: playlistName,
      playlist_url: playlistUrl,
    })
  })

  socket.on('addMusicToPlaylist', async(data, callback) => {
    var token_data = data.token_data;
    const get_uris = data.get_uris;

    var access_token = token_data.access_token;

    if (token_data.expires_on < new Date().getTime()) {
      const newTokenData = await refreshAccessToken(token_data.refresh_token, client_id, client_secret)
      socket.emit('updateTokenData', newTokenData)

      access_token = newTokenData.access_token
    }

    var playlist_id = data.playlist_url != null ? playlistIDFromLink(data.playlist_url) : null
    var playlist_url = data.playlist_url != null ? data.playlist_url : null
    var playlist_name = data.playlist_name

    

    if (playlist_name != null && playlist_id == null) {
      const userProfile = await getCurrentUserProfile(access_token)
      const userID = userProfile.id
      
      const req = await createUserPlaylist(access_token, userID, playlist_name, '', true, false)
      const newPlaylist = req.data
      playlist_id = newPlaylist.id
      playlist_url = newPlaylist.external_urls.spotify
    }

    await addItemsToUserPlaylist(access_token, playlist_id, get_uris)

    callback({
      playlist_name: playlist_name,
      playlist_url: playlist_url,
      playlist_id: playlist_id
    })


  })
})

httpServer.listen(3000)

// app.get('/', (req, res) => {
  
// })

// app.listen(3000)
