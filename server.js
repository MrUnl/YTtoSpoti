const express = require('express')
const app = express();
const passport = require('passport')
const SpotifyStrategy = require('passport-spotify').Strategy;
const PORT = process.env.PORT || 3000
const session = require('express-session')
const convert = require('./apis')
const axios = require('axios');
const getPlaylistInfo = require('./apis');
if (process.env.NODE_ENV !== "production") {
    require("dotenv").config()
}

app.use(session({
    secret: process.env.SECRET,
    saveUninitialized: true,
    resave: true
}));
app.use(express.urlencoded({
    extended: false
}))
app.use(express.json());
app.use(passport.initialize());
app.use(passport.session());
app.set("view engine", "ejs");
app.use(express.static("assets"))

passport.serializeUser(function (user, done) {
    done(null, user);
});

passport.deserializeUser(function (user, done) {
    done(null, user);
});


passport.use(
    new SpotifyStrategy({
            clientID: process.env.SPOTIFY_CLIENT_ID,
            clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
            callbackURL: `http://localhost:${PORT}/auth/callback`
        },
        function (accessToken, refreshToken, expires_in, profile, done) {
            return done(null, {profile,accessToken})
        }
    )
);

app.get("/auth", passport.authenticate('spotify', {
    scope: ['user-read-email', 'user-read-private', 'playlist-modify-public', 'playlist-modify-private']
}))
app.get(
    '/auth/callback',
    passport.authenticate('spotify', {
        failureRedirect: '/'
    }),
    function (req, res) {
        req.session.user = req.session.passport.user.profile;
        req.session.accessToken = req.session.passport.user.accessToken

        res.redirect('/');
    }
);

app.get('/', (req, res) => {
    if(!req.session.user){
        return res.redirect("/auth");
    }
    return res.render("index",{user:req.session.user})
})

app.post("/playlist", async (req, res) => {
    let playlistId = "";
    if(req.body.name && req.body.id){
        getPlaylistInfo(req.body.id,async names => {
        console.log(names);
        let params = {
            name: req.body.name,
            description: "Generated With Yt to Spoti App",
            public: true
        }
        const headers = {
            "Content-Type":"application/json",
            Authorization:`Bearer ${req.session.accessToken}`
        }
        axios.post(`https://api.spotify.com/v1/users/${req.session.user.id}/playlists`, params, {headers})
            .then(async result => {
                playlistId = result.data.id;
                await names.forEach(async name => {
                    params = {
                        q: name,
                        type: "track"
                    }
                    const res = await axios.get(`https://api.spotify.com/v1/search?query=${encodeURI(name)}&type=track`,{headers})
                    if(res.data.tracks.items.length > 0){
                        
                        const trackRes = await axios.post(`https://api.spotify.com/v1/playlists/${playlistId}/tracks?uris=${encodeURI(res.data.tracks.items[0].uri)}`,{},{headers}).catch(err => console.log(err))
                        console.log(trackRes.data);
                    }
                })
                return res.redirect("/")})
            .catch(err => console.error(err))
        });
    }else{

        return res.status(400).send("Bir hata oluştu")
    }
   
})

app.listen(PORT)