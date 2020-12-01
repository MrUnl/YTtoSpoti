const {
    google
} = require('googleapis')
const axios = require('axios')

if (process.env.NODE_ENV !== "production") {
    require("dotenv").config()
}


let playlistName = "";
let playlistId = "";
const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${process.env.SPOTIFY_AUTH_KEY}`
}
/**
 * 
 * @param {String} id Youtube Playlist Id
 * @returns {Array}
 */
function getPlaylistInfo(id,callback) {
    try {
        google.youtube("v3").playlistItems.list({
            key: process.env.API_KEY,
            part: "snippet",
            playlistId: id,
            maxResults: 50
        }).then(async res => {
            let names = res.data.items.map(item => {
                return item.snippet.title.replace(/(\[|\()?Official( Music)?( Lyrics)?( Visual)?( Video)?(\]|\))?/gi,"").trim()
            })
            callback(names);
        })
    } catch (error) {
        console.log(error);
    }
}

function createPlaylist(names,user_id) {
    let params = {
        name: playlistName,
        description: "Generated With Yt to Spoti App",
        public: true
    }
    
    axios.post(`https://api.spotify.com/v1/users/${user_id}/playlists`, params, {headers})
        .then(async res => {
            playlistId = res.data.id;
            let trackUris = [];
            await names.forEach(async name => {
                params = {
                    q: name,
                    type: "track"
                }
                const res = await axios.get(`https://api.spotify.com/v1/search?query=${encodeURI(name)}&type=track&offset=0&limit=20`,{headers})
                if(res.data.tracks.items.length > 0){
                    trackUris.push(res.data.tracks.items[0].uri)
                    
                    const trackRes = await axios.post(`https://api.spotify.com/v1/playlists/${playlistId}/tracks?uris=${encodeURI(res.data.tracks.items[0].uri)}`,{},{headers}).catch(err => console.log(err))
                    console.log(trackRes.data);
                }
            })
        })
        .catch(err => console.error(err))
}


module.exports = getPlaylistInfo;