import axios from "axios"

class URLError extends Error {
    constructor(message) {
        super(message);
        this.name = 'URLError';
    }
}

function isYouTubeUrl(url) {
    let regex = /^(https?\:\/\/)?((www\.)?youtube\.com|youtu\.be)\/.+$/g
    return url.search(regex) == -1 ? false : true
}

function progressiveSearch(plainText, searchPattern) {
    const regexSearchPattern = new RegExp(searchPattern);
    const match = plainText.match(regexSearchPattern);

    if (match == null) {
        return null;
    }

    var finalString = "";
    var count = match.index + match[0].length;

    while (true) {
        let letter = plainText[count]
        if (letter == "\"") {
            if (plainText[count - 1] == "\\") {
                finalString += letter;
                count += 1;
            }
            else break;
        }
        else {
            finalString += letter;
            count += 1;
        }
        finalString = finalString.replace('\\n', '\n');
        finalString = finalString.replace('\\r', '\r');
    }

    return finalString

}

async function getVideoMusic(url) {
    if (!isYouTubeUrl(url)) {
        throw URLError('Not a valid YouTube URL')
    }

    var returnInfo = null;

    let req = await axios.get(url);
    let status = req.status
    let data = req.data


    if (!status == 200) {
        return Error(`Request failed. Status code ${status}`);
    }

    let fullHTML = (' ' + data).slice(1);

    let videoInformation = {
        'title': progressiveSearch(fullHTML, /"videoId":"[^"]+","title":"/),
        'author': progressiveSearch(fullHTML, /ownerChannelName":"/),
        'description': progressiveSearch(fullHTML, /shortDescription":"/)
    }

    let songs = [];
    let songNames = Array();
    let artistNames = Array();

    let musicFindPattern = /(\{\"compactVideoRenderer\"\:\{\"title\"\:)(\{\"runs\"\:\[{\"text\"|\{\"simpleText\")\:\"[^"]+\"/g;
    let musicFind = fullHTML.matchAll(musicFindPattern);

    let artistsFindPattern = /(\{\"title\"\:\{\"simpleText\"\:\"ARTIST\"\},\"defaultMetadata\":)(\{\"runs\"\:\[{\"text\"|\{\"simpleText\")\:\"[^"]+\"/g;
    let artistsFind = fullHTML.matchAll(artistsFindPattern);

    for (let find of artistsFind) {
        let foundText = find[0];
        let getArtist = foundText.match(/\"[^"]+\"$/)[0];
        let artistName = getArtist.slice(1, -1);
        artistNames.push(artistName);
    }

    for (let find of musicFind) {
        let foundText = find[0];
        let getMusic = foundText.match(/\"[^"]+\"$/)[0];
        let musicName = getMusic.slice(1, -1);
        songNames.push(musicName);
    }

    for (let i = 0; i < songNames.length; i++) {
        songs.push(
            {
                song_name: songNames[i],
                artist: artistNames[i]
            }
        )
    };

    videoInformation['songs'] = songs;

    return videoInformation
}

export {
    isYouTubeUrl, 
    progressiveSearch, 
    getVideoMusic
}