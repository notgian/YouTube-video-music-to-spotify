const socket = io();

var appState;

//

function removeHTMLChildren(element, ...types) {
  const children = element.children

  var childrenToRemove = []

  if (types != []) {
    for (let child of children) {
      if (child.tagName.toLowerCase() in types) {
        childrenToRemove.push(child)
      }
    }
  }

  else childrenToRemove = children

  const childrenToRemoveLength = childrenToRemove.length

  for (i = 0; i < childrenToRemoveLength; i++) {
    childrenToRemove[0].remove()
  }
}

const loadingModalHTML = document.getElementById('loading-modal');
const loadingModal = new bootstrap.Modal(loadingModalHTML, {});

const errorModalHTML = document.getElementById('error-modal');
const errorModal = new bootstrap.Modal(errorModalHTML, {})

const songsConfirmationModalHTML = document.getElementById('songs-confirmation-modal');
const songsConfirmationModal = new bootstrap.Modal(songsConfirmationModalHTML, {});

const completionModalHTML = document.getElementById('completion-modal');
const completionModal = new bootstrap.Modal(completionModalHTML, {});

function setLoadingMessage(message) {
  document.getElementById("loading-modal-text").innerText = message
}

function setErrorMessage(message){
  document.getElementById("error-modal-body").innerText = message
}

//

  const mainForm = document.getElementById('mainForm');
  mainForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const inputs = mainForm.getElementsByTagName('input');
    let sendData = {}
    for (let input of inputs) {
      let name = input.name;
      let value = input.value;

      sendData[name] = value;
    }

    setLoadingMessage("Retrieving Songs...");

    loadingModal.show();

    const modalCheckboxContainer = document.getElementById('modal-checkbox-container');
    removeHTMLChildren(modalCheckboxContainer, 'input', 'label', 'a');

    socket.emit('getMusic', sendData, (resData) => {
      if (resData.youtube_songs.length < 1) {
        setErrorMessage('No songs in the YouTube video detected. YouTube may not have detected any songs in the video, therefore the app cannot retrieve any music. Please try again or enter a different link.')
        loadingModal.hide()
        errorModal.show();
        return
      }
      for (let song of resData.spotify_songs){
        function getArtists(artistArr) {
          var artistNamesArr = Array()
          for (let artist of artistArr) artistNamesArr.push(artist.name)
          return artistNamesArr
        }

        const trackArtists = getArtists(song.tracks.items[0].artists);
        const trackName = song.tracks.items[0].name;
        const trackID = song.tracks.items[0].id;
        const trackLink = song.tracks.items[0].external_urls.spotify;
        const trackURI = song.tracks.items[0].uri;
        const albumImageLink = song.tracks.items[0].album.images[2].url
        const previewURL = song.tracks.items[0].preview_url

        const checkDiv = document.createElement("div");
        checkDiv.className = "form-check";

        // ^^ 

        const checkInput = document.createElement("input");
        checkInput.className = "form-check-input";
        checkInput.type = "checkbox";
        checkInput.value = "";
        checkInput.checked = true;
        checkInput.setAttribute('trackID', trackID);
        checkInput.setAttribute('trackURI', trackURI);

        const checkLabel = document.createElement("label");
        checkLabel.className = "form-check-label";
        checkLabel.htmlFor = "form-check-input";

        // ^^

        const checkLink = document.createElement("a");
        checkLink.classList = "link-body-emphasis link-offset-1 link-underline link-underline-opacity-0 link-underline-opacity-75-hover";
        checkLink.href = trackLink;
        checkLink.target = '_blank';
        checkLink.innerHTML = `${trackName} - ` + trackArtists.join(', ');
        checkLink.setAttribute('data-toggle', 'tooltip')
        let songPreviewText = previewURL == null ? '<span class="text-warning"> Song Preview Unavailable </span>' : ''
        checkLink.setAttribute('title', `<span class='tooltip-container d-flex flex-column justify-content-center align-items-center p-2'> <img src='${albumImageLink}' class='mb-2'/> <div> ${trackName}</div> <div class="text-secondary-emphasis"> ${trackArtists.join(', ')} </div>` + songPreviewText + '</span>')
        checkLink.setAttribute('data-bs-custom-class', 'music-tooltip')
        new bootstrap.Tooltip(checkLink, { html: true })

        //

        if (previewURL != null) {
          const songPreview = new Audio(previewURL);
          songPreview.volume = '0.2'
          checkLink.appendChild(songPreview);

          checkLink.onmouseenter = (event) => {
            const audioEl = event.target.children[0]
            var isPlaying = audioEl.currentTime > 0 && !audioEl.paused && !audioEl.ended && audioEl.readyState > audioEl.HAVE_CURRENT_DATA;
            if (!isPlaying) {
              audioEl.play()
            }
          }

          checkLink.onmouseleave = (event) => {
            const audioEl = event.target.children[0]
            if (!audioEl.paused) {
              audioEl.pause()
            }
          }
        }

        checkLabel.appendChild(checkLink);
        checkDiv.appendChild(checkInput);
        checkDiv.appendChild(checkLabel);
        modalCheckboxContainer.appendChild(checkDiv);

        // let resData = testData

        document.getElementById("select-song-proceed").onclick = (event) => handleProceed(event, modalCheckboxContainer, resData.playlist_name, resData.playlist_url)

      }
      loadingModal.hide()
      songsConfirmationModal.show();
    })

    function handleProceed(event, form, playlistName, playlistURL) {

      setLoadingMessage("Adding Songs To Playlist...")
      songsConfirmationModal.hide();
      loadingModal.show();

      let inputs = form.querySelectorAll('.form-check-input');
      var send_data = []

      for (let input of inputs) {
        if (input.checked) {
          send_data.push(input.getAttribute('trackURI'))
        }
      }

      socket.emit('addMusicToPlaylist', {
        token_data: {
          access_token: localStorage.access_token,
          expires_on: localStorage.expires_on,
          refresh_token: localStorage.refresh_token
        },
        get_uris: send_data,
        playlist_name: playlistName,
        playlist_url: playlistURL
      }, (resData) => {
        const playlistURL = resData.playlist_url; 
        const playlistID = resData.playlist_id;

        const completionModalLink = document.getElementById('completion-modal-link');
        const completionModalPlaylistID = document.getElementById('completion-modal-playlistID');

        completionModalLink.href = playlistURL;
        completionModalPlaylistID.innerText = playlistID;

        loadingModal.hide();
        completionModal.show();
      })


    }

  })


socket.on('getMusicRes', (data) => {
  console.log(data)
})

socket.on('updateTokenData', (data) => {
  const now = new Date()
  localStorage.setItem('access_token', data.access_token)
  localStorage.setItem('expires_on', new Date(now.getTime() + data.expires_in))

  console.log('token data updated!')
})
// create a modal model (funny hehe)
// create a 