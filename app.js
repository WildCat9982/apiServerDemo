const express = require('express')
var path = require('path');
const jwt = require('jsonwebtoken')

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


app.get('/api', (req, res) => {
    res.json({
        message: 'API Testing page'
    })
})

app.post('/api/posts', verifyToken, (req, res) => {
    jwt.verify(req.token, SECRET_KEY, (err, authData) => {
        if (err) {
            res.sendStatus(403); // forbidden
        } else {
            res.json({
                message: 'Posts created...',
                authData

            })
        }
    })
})

app.get('/api/token', (req, res)=> {
    res.render("token", { title: "Login Page" });
})

app.post('/api/login', (req, res) => {
    console.log('post login')
    const {username, password} = req.body;

    const user = users.find( (user) => user.username === username && user.password === password);
    if (!user)
        res.status(401).send('incorrect username or password')

    jwt.sign({user: user}, SECRET_KEY, (err, token) => {
        res.json({
            token,
        })
    })
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
