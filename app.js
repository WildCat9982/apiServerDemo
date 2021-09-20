const express = require('express')
var path = require('path');
const jwt = require('jsonwebtoken')
const uuidv4 = require('uuid').v4;
const moment = require('moment');

const app = express()

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

const SECRET_KEY = 'structo'
const users = [
    {
        id: 1001,
        username: 'KelvinLee',
        password: '123456',
        role: 'admin'
    },
    {
        id: 1002,
        username: 'Justin',
        password: '123456',
        role: 'user'
    }
]

// a list to holds all refresh token issused to user
var refreshTokens = []

app.post('/about', verifyToken, (req, res) => {
    jwt.verify(req.token, SECRET_KEY, {ignoreExpiration: false}, (err, authData) => {
        if (err) {
            res.status(401).json({message: 'Invalid Token'})
        } else {
            res.send('<h1>Hello World!</h1>')
        }
    })
})

app.post('/revoke-token', (req, res) => {
    try {
        const {accessToken, refreshToken } = req.body;
        jwt.verify(accessToken, SECRET_KEY, {ignoreExpiration: false}, (err, authData) => {
            if (err) {
                res.sendStatus(403); // forbidden
            } else {

                console.log('authData', authData)
                // retrieve access token jwtId 
                const acessTokenJwtId = authData['jti'];
                console.log(acessTokenJwtId, refreshToken)

                // check if the refresh token is linked to the acccess token
                if(acessTokenJwtId !== refreshToken)
                    throw Error("Token does not match with Refresh Token");

                // search refresh token from the refresh token store
                const oldRefreshToken = refreshTokens.find( (token) => token.jwtId === refreshToken);
                if (!oldRefreshToken) 
                    throw Error('refresh token does not exist');

                if (oldRefreshToken.revoked || oldRefreshToken.used)
                    throw Error ("Refresh Token has used or been revoked")

                // check if the refresh token has expired:
                if (moment().isAfter(oldRefreshToken.expiryDate))
                    throw new Error("Refresh Token has expired")
                
                const userDto = oldRefreshToken.user;
                console.log(userDto)
                
                // verified that refresh token is valid:
                // create access token with 15mins expirydate
                oldRefreshToken.revoked = true;
                res.status(200).json({
                    message: 'Token has been revoked successfully'
                });
            }
        })
    } catch (error) {
        res.status(500).json({
            message: error.message
        })
    }

})

app.post('/refresh-token', (req, res) => {
    try {
        const {accessToken, refreshToken } = req.body;
        jwt.verify(accessToken, SECRET_KEY, {ignoreExpiration: false}, (err, authData) => {
            if (err) {
                res.sendStatus(403); // forbidden
            } else {

                console.log('authData', authData)
                // retrieve access token jwtId 
                const acessTokenJwtId = authData['jti'];
                console.log(acessTokenJwtId, refreshToken)

                // check if the refresh token is linked to the acccess token
                if(acessTokenJwtId !== refreshToken)
                    throw Error("Token does not match with Refresh Token");

                // search refresh token from the refresh token store
                const oldRefreshToken = refreshTokens.find( (token) => token.jwtId === refreshToken);
                if (!oldRefreshToken) 
                    throw Error('refresh token does not exist');

                if (oldRefreshToken.revoked || oldRefreshToken.used)
                    throw Error ("Refresh Token has used or been revoked")

                // check if the refresh token has expired:
                if (moment().isAfter(oldRefreshToken.expiryDate))
                    throw new Error("Refresh Token has expired")
                
                const userDto = oldRefreshToken.user;
                console.log(userDto)
                // verified that refresh token is valid:
                // create access token with 15mins expirydate
                const jwtId = uuidv4();
                const options = {
                    expiresIn: "15m",
                    jwtid: jwtId,    // specify jwtid (an id that token)  (needed for the refresh token, as a refresh token only points to one single unique token)
                    subject: userDto.id.toString() // the subject should be the users id (primary key)
                }

                jwt.sign({user: userDto}, SECRET_KEY, options, (err, token) => {
                    if (err) {
                        res.sendStatus(403);
                    } else {
                        
                        // set the old refresh token as been used
                        oldRefreshToken.used = true;

                        // create Refresh Token  with 7-days expriy and store it into RefreshtTokenList
                        const newRefreshToken = {
                            user: userDto, 
                            jwtId: jwtId,
                            expriyDate: moment().add(7, "d").toDate(),
                            used: false,
                            revoked: false
                        }
                        refreshTokens.push(newRefreshToken)
                        console.log('refreshTokens length:', refreshTokens.length)
                        console.log(refreshTokens[refreshTokens.length-1])
                        res.json({
                            token: {
                                accessToken: token,
                                refreshToken: newRefreshToken.jwtId
                            }
                        })
                    }
                })
            }
        })
    } catch (error) {
        res.status(500).json({
            message: error.message
        })
    }
})

app.get('/token', (req, res)=> {
    res.render("token", { title: "Login Page" });
})

app.post('/login', (req, res) => {
    const {username, password} = req.body;
    const user = users.find( (user) => user.username === username && user.password === password);
    if (!user) {
        res.status(401).send('incorrect username or password')
    }
    else {
        const jwtId = uuidv4();
        const options = {
            expiresIn: "15m",
            jwtid: jwtId,    // specify jwtid (an id that token)  (needed for the refresh token, as a refresh token only points to one single unique token)
            subject: user.id.toString() // the subject should be the users id (primary key)
        }

        // create access token with 15mins expirydate
        const userDto = {
            id: user.id,
            username: user.username,
            role: user.role
        }
        jwt.sign({user: userDto}, SECRET_KEY, options, (err, token) => {
            if (err) {
                res.sendStatus(403);
            } else {
        
                // create Refresh Token  with 7-days expriy and store it into RefreshtTokenList
                const refreshToken = {
                    user: userDto, 
                    jwtId: jwtId,
                    expriyDate: moment().add(7, "d").toDate(),
                    revoked: false
                }
                refreshTokens.push(refreshToken)
                console.log('refreshTokens length:', refreshTokens.length)
                console.log(refreshTokens[refreshTokens.length-1])
                res.json({
                    token: {
                        accessToken: token,
                        refreshToken: refreshToken.jwtId
                    }
                })
            }
        })
    }
})

function verifyToken(req, res, next) {
    const bearerHeader = req.headers['authorization']
    if (typeof bearerHeader !== 'undefined') {
        const bearerToken = bearerHeader.split(' ')[1]
        req.token = bearerToken
        next()
    } else {
        res.sendStatus(403) // forbidden
    }
}

module.exports = app;
