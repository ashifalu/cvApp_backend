const mongoose = require('mongoose')

const connectionString = process.env.DATABASE

mongoose.connect(connectionString).then(()=>{
    console.log("mongoDb connected successfully");
    
}).catch((err)=>{
    console.log(`mongoDB failed to connect due to ${err}`);
    
})