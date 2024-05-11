import dotenv from 'dotenv'
import connectDB from './database/index.js'

dotenv.config({
    path: './env',
})

connectDB()