# YouTube-video-music-to-spotify

A simple project obtains the music that YouTube detects on a video and ports them onto a Spotify playlist using the Spotify Web API. It is a simple web app, which is relatively self explanatory for the user. The user can choose to provide a link for an existing playlist if they wish, or set a name for the playlist to be created. The absence of both fields will default to the creation of a playlist with the name of the youtube video.

## Use Instructions

This project is unfortunately only hosted locally because (1) I cannot host it on my own hardware, and (2) I do not wish to pay an external service to keep it running. However, if you are interested in using it, do the following:

1. Go to https://developer.spotify.com/[https://developer.spotify.com], login, and enter your dashboard.
2. Create an app and obtain the client secret and client id of the app.
![Screenshot from 2023-08-11 15-51-01](https://github.com/notgian/YouTube-video-music-to-spotify/assets/85060753/39bebfa4-5ca8-4f34-9b38-7a75f76aae19)
3. In the app settings, add a redirect URI and set it to `http://localhost:3000/callback`. You have the option to change the port number, but if you wish to do so, you need to go through the source code to make sure that any instance of this host is also edited accordingly. 
4. Add a `.env` file in the main directory and add two fields: `CLIENT_ID` and `CLIENT_SECRET` (all caps).
5. Set the fields to be equal to your app's client id and client secret
> CLIENT_ID="your app's client id"
> CLIENT_SECRET="your app's client secret"
