import {asyncHandler} from '../utils/asyncHandler.js'
import {ApiError} from '../utils/ApiError.js'
import {User} from '../models/user.models.js'
import { uploadOnCloudinary } from '../utils/cloudinary.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import jwt from 'jsonwebtoken'

const generateAccessAndRefreshTokens = async(userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.refreshAccessToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return {accessToken, refreshToken}


    } catch (err) {
        throw new ApiError(500, "Something went wrong while generating refresh and access token")
    }
}

const registerUser = asyncHandler(async (req, res) => {
    const {username, email, fullName, password} = req.body
    //console.log("email: ", email)

    if([fullName, username, email, password].some(field => field.trim().length==0)){
        throw new ApiError(400, "All fields are required")
    }

    const existedUser = await User.findOne({
        $or: [ {username}, {email}]
    })

    if(existedUser){
        throw new ApiError(409, "User already exists")
    }

    const avatarLocalPath = req.files?.avatar[0]?.path
    let coverImageLocalPath;

    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length>0){
        coverImageLocalPath = req.files.coverImage[0].path
    }
    

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

const loginUser = asyncHandler( async (req, res) => {
    const {username, email, password} = req.body

    if(!username && !email){
        throw new ApiError(400, "username or email is required");
    }

    const user = await User.findOne({$or : [{username}, {email}]});
    if(!user){
        throw new ApiError(404, "User doesn't exist")
    }

    const passwordCorrect = await user.isPasswordCorrect(password);

    if(!passwordCorrect){
        throw new ApiError(400, "Invalid User credentials")
    } 

    const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    // when we do this, our cookie will only be modifiable by server and not from frontend side
    const options = {
        httpOnly: true,
        secure: true,
    }

    return res.status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(
            200, 
            {user: loggedInUser, accessToken, refreshToken},
            "User logged in Successfully"
        )
    )
})

const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(req.user._id, {
        $set: {
            refreshToken: undefined,
            accessToken: undefined,
        }
    }, {
        new: true
    })

    const options = {
        httpOnly: true,
        secure: true
    }

    return res.status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json( new ApiResponse(200, {}, "User logged Out"))
})

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if(!incomingRefreshToken){
        throw new ApiError(400, "Unauthorized request")
    }

    try {
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
    
        const user = User.findById(decodedToken?._id)
    
        if(!user){
            throw new ApiError(401, "Invalid Refresh Token")
        }
    
        if(incomingRefreshToken !== user?.refreshToken){
            throw new ApiError(401, "Refresh Token is used or expired")
        }
    
        const options = {
            httpOnly: true,
            secure: true
        }
    
        const {accessToken, newRefreshToken} = generateAccessAndRefreshTokens(user._id)
    
        res.status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newRefreshToken, options)
        .json(new ApiResponse(200,
            {accessToken, refreshToken: newRefreshToken},
            "Access Token refreshed successfully"
        ))
    } catch (error) {
        throw new ApiError(400, "Something went wrong in accessing tokens")
    }
})

const changeCurrentPassword = asyncHandler(async (req, res) => {
    const {oldPassword, newPassword} = req.body

    const user = await User.findById(req.user?._id)

    if(!user){
        throw new ApiError(400, "Something went wrong")
    }

    const passwordRight = user.isPasswordCorrect(oldPassword)

    if(!passwordRight){
        throw new ApiError(400, "Invalid old password")
    }

    user.password = newPassword
    
    const doneOrNot = await user.save({validateBeforeSave: false})

    if(!doneOrNot){
        throw new ApiError(400, "Something went wrong while setting new Password")
    }

    return res
    .status(200)
    .json(new ApiResponse(200,
        {user},
        "Password Changed Successfully",
    ))
})

const getCurrentUser = asyncHandler(async(req, res) => {
    return res
    .status(200)
    .json(200, req.user, "Current User fetched successfully")
})

const updateAccountDetails = asyncHandler(async(req, res) => {
    const {fullName, email} = req.body

    if(!fullName && !email){
        throw new ApiError(400, "All fields are required")
    }

    const user = User.findByIdAndUpdate(
        req.user?._id, 
        {
            $set: {
                fullName,
                email
            }
        }, 
        {new: true}
    ).select("-password -refreshToken")

    return res.status(200)
    .json(new ApiResponse(
        200,
        user, 
        "Account Details Updated Successfully"
    ))
})

const updateUserAvatar = asyncHandler(async(req, res) => {
    const avatarLocalPath = req.file?.path

    if(!avatarLocalPath){
        throw new ApiError(400, "File is missing")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if(!avatar.url){
        throw new ApiError(400, "Error while uploading on cloudinary")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatar.url
            }
        },
        {new: true}
    ).select("-password -refreshToken")

    return res.status(200)
    .json(200,
        user,
        "Avatar Updated Successfully"
    )
})

const updateUserCoverImage = asyncHandler(async(req, res) => {
    const coverImageLocalPath = req.file?.path

    if(!coverImageLocalPath){
        throw new ApiError(400, "File is missing")
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!coverImage.url){
        throw new ApiError(400, "Error while uploading on cloudinary")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage: coverImage.url
            }
        },
        {new: true}
    ).select("-password -refreshToken")

    return res.status(200)
    .json(200,
        user,
        "Cover Image Updated Successfully"
    )
})

const getUserChannelProfile = asyncHandler(async(req, res) => {
    const {username} = req.params

    if(!username?.trim){
        throw new ApiError(400, "Username is required")
    }

    const channel = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase()
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        }, 
        {
            $addFields: {
                subscribersCount: {$size: "$subscribers"},
                channelSubscribedToCount: {$size: "$subscribedTo"},
                isSubscribed: {
                    $cond: {
                        if: {$in: [req.user?._id, "$subscribers.subscriber"]},
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                fullName: 1,
                userName: 1,
                subscribersCount: 1,
                channelsSubscribedToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1
            }
        }
    ])

    if(!channel?.length){
        throw new ApiError(400, "Channel not found")
    }

    return res.status(200)
    .json(
        new ApiResponse(
            200,
            channel[0],
            "Channel fetched successfully"
        )
    )
}) 

const getWatchHistory = asyncHandler(async(req, res) => {   
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "user",
                            localField: "creator",
                            foreignField: "_id",
                            as: "creator", 
                            pipeline: [
                                {
                                    $project: {
                                        fullName: 1,
                                        userName: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields: {
                            owner: {
                                $first: "$creator"
                            }
                        }
                    }
                ]
            }
        }
    ])

    return res.status(200)
    .json(
        new ApiResponse(200, user[0], "Watch History fetched successfully")
    )
})

export {registerUser, loginUser, logoutUser, refreshAccessToken,
    changeCurrentPassword, updateUserAvatar, updateUserCoverImage,
    updateAccountDetails, getCurrentUser, getUserChannelProfile,
    getWatchHistory
}


// get user details from frontend
// validation-not empty
// check if user exist or not
// check for images, check for avatar
// if all correct, upload it to cloudinary
// create user object - create entry in db
// remove password and refresh token field from response 
// check for user creation
// return response

// req body -> data
// username or email verification
// find the user
// match the password
// access and refresh tokens
// send cookie

// if in some case like (req, res, next) we add, sometimes we don't need
// res or maybe req, then in that case we can just add _ in that place
// like (req, _, next)