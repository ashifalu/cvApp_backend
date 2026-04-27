require('dotenv').config()
const express = require('express');

const cors = require('cors')
const routes = require('./routes')

// crete server
const server = express();

// to connect with frontend
server.use(cors());

//  to parse json datas
server.use(express.json({ limit: '10mb'}));
server.use(routes)
// In your backend index.js
server.use('/images', express.static('public/images'));

require('./connection')

const PORT = 4000 || process.env.PORT


server.listen(PORT,()=>{
    console.log(`server running successfully at ${PORT}`);
    
})
