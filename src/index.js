import dotenv from 'dotenv'
import connectDB from './database/index.js'

dotenv.config({
    path: './env',
})

connectDB().then(() => {
    app.listen(process.env.PORT || 8000, () => {
        console.log(`Server is running at port: ${process.env.PORT}`);
    })
})
.catch((error) => {
    console.log(`MongoDB connection fails !!! `, error)
})