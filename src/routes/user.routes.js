import { Router } from "express";
import { changeCurrentPassword, getCurrentUser, getUserChannelProfile, getWatchHistory, loginUser, logoutUser, refreshAccessToken, registerUser, updateAccountDetails, updateUserAvatar, updateUserCoverImage } from "../controllers/user.controller.js";
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
router.route("/refresh-token").post(refreshAccessToken)
router.route("/change-password").post(verifyJwt, changeCurrentPassword)
router.route("/current-user").get(verifyJwt, getCurrentUser)
router.route("/update-details").patch(verifyJwt, updateAccountDetails)
router.route("/avatar").patch(verifyJwt, upload.single('avatar'), updateUserAvatar)
router.route("/cover-image").patch(verifyJwt, upload.single('coverImage'), updateUserCoverImage)
router.route("/c/:username").get(verifyJwt, getUserChannelProfile)
router.route("/history").get(verifyJwt, getWatchHistory)

// pehle app.js mein call hogi and then wo register ke liye redirect hogi yahan toh 
// toh jo hmara address banega wo banega iss type se https://localhost:8000/api/v1/user/register

export default router