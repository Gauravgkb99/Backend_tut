import mongoose from 'mongoose'
import { DB_NAME } from '../constants.js'
import express from 'express'

const app = express() 

const connectDB = async () => {                  
    try{                        
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`)
        
        console.log(`\n MongoDB connected !! DB Host: ${connectionInstance.connection.host}`)
    }
    catch(error){
        console.error("MongoDB connection error", error)
        process.exit(1)
        // throw err
    }                         
}

export default connectDB 