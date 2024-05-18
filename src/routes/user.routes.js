import { Router } from "express";
import { loginUser, logoutUser, registerUser } from "../controllers/user.controller.js";
import {upload} from '../middlewares/multer.middleware.js'
import { verifyJwt } from "../middlewares/auth.middleware.js";

const router = Router();

router.route('/register').post(
    upload.fields([
        {name: 'avatar', maxCount: 1}, 
        {name: 'coverImage', maxCount: 1}
    ]),
    registerUser
)

router.route('/login').post(loginUser)

// secured routes
router.route("/logout").post(verifyJwt, logoutUser)

// pehle app.js mein call hogi and then wo register ke liye redirect hogi yahan toh 
// toh jo hmara address banega wo banega iss type se https://localhost:8000/api/v1/user/register

export default router