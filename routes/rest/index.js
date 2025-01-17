/* eslint-disable import/no-extraneous-dependencies */
const express = require("express")
const router = express.Router()
const expressJwt = require("express-jwt")
const multer = require("multer")
const upload = multer({ dest: "uploads/" })
const checkJwt = expressJwt({ secret: process.env.SECRET, algorithms: ["HS256"] }) // the JWT auth check middleware

const users = require("./users")
const insta = require("./insta")
const login = require("./auth")
const signup = require("./auth/signup")
const session = require("./session")
const forgotpassword = require("./auth/password")

router.post("/login", login.post) // UNAUTHENTICATED
router.post("/forgotpassword", forgotpassword.startWorkflow) // UNAUTHENTICATED; AJAX
router.post("/resetpassword", forgotpassword.resetPassword) // UNAUTHENTICATED; AJAX
router.get("/sessionstorage", session.sessionStore)
router.get("/download", insta.downloadFile)

router.all("*", checkJwt) // use this auth middleware for ALL subsequent routes

// insta api for user
router.get("/me", users.get)
router.get("/user/:id", users.getById) // UNAUTHENTICATED
router.post("/users", users.getAll) // UNAUTHENTICATED
router.put("/user/:id", users.put)
router.get("/resend/email/:id", users.resendEmail)

// onboard api
router.post("/signup", signup.post) // UNAUTHENTICATED

// insta api
router.post("/start/make/closefriend", upload.single("file"), insta.addFriend)
router.post("/upload", upload.single("file"), insta.uploadCsv)
router.post("/upload/json", upload.single("file"), insta.uploadJson)
router.post("/get/freinds/list", insta.getFreindsList)
router.post("/get/activities", insta.getActivities)

router.get("/get/freind", insta.getFreind)
router.post("/closefreind/added", insta.closeFreindAdded)
router.post("/closefreind/not/found", insta.closeFreindNotFound)
router.post("/rectify/data", insta.rectifyData)

module.exports = router
