import { Router } from "express";
import { registerUser } from "../controllers/user.controller.js";
import {upload} from '../middlewares/multer.middleware.js'

const router = Router();

router.route('/register').post(
    upload.fields([
        {name: 'avatar', maxCount: 1}, 
        {name: 'coverImage', maxCount: 1}
    ]),
    registerUser
)

// pehle app.js mein call hogi and then wo register ke liye redirect hogi yahan toh 
// toh jo hmara address banega wo banega iss type se https://localhost:8000/api/v1/user/register

export default router