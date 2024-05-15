import {asyncHandler} from '../utils/asyncHandler.js'
import {ApiError} from '../utils/ApiError.js'
import {User} from '../models/user.models.js'
import { uploadOnCloudinary } from '../utils/cloudinary.js'
import { ApiResponse } from '../utils/ApiResponse.js'

const registerUser = asyncHandler(async (req, res) => {
    const {username, email, fullName, password} = req.body
    console.log("email: ", email)

    if([fullName, username, email, password].some(field => field.trim() === "")){
        throw new ApiError(400, "All fields are required")
    }

    const existedUser = User.findOne({
        $or: [ {username}, {email}]
    })

    if(existedUser){
        throw new ApiError(409, "User already exists")
    }

    const avatarLocalPath = req.files?.avatar[0]?.path
    const coverImageLocalPath = req.files?.coverImage[0]?.path

    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar is required")
    }

    const uploadAvatar = await uploadOnCloudinary(avatarLocalPath);
    const uploadCoverImage = await uploadOnCloudinary(coverImageLocalPath);

    if(!uploadAvatar){
        throw new ApiError(500, "Something went wrong while uploading on avatar")       
    }

    const user = await User.create({
        username: username.toLowerCase(),
        email,
        fullName,
        password,
        avatar: uploadAvatar.url,
        coverImage: uploadCoverImage?.url || "",
    })

    const createdUser = await User.findById(user._id).select("-password -refreshToken")

    if(!createdUser){
        throw new ApiError(500, "Something went wrong while registering")
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered Successfully")
    )
})

export {registerUser}


// get user details from frontend
// validation-not empty
// check if user exist or not
// check for images, check for avatar
// if all correct, upload it to cloudinary
// create user object - create entry in db
// remove password and refresh token field from response 
// check for user creation
// return response