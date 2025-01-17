const randomstring = require("randomstring")
const User = require("../../models/user")
const mailer = require("../../lib/mail")

module.exports = {
  /**
    *
    * @api {get} /me 1.0 login user details
    * @apiName userDetails
    * @apiGroup User
    * @apiVersion  1.0.0
    * @apiPermission User
    *
    * @apiHeader {String} Authorization The JWT Token in format "Bearer xxxx.yyyy.zzzz"
    *
    *
    * @apiSuccessExample {type} Success-Response:
      {
        "error" : false,
        "user" : {
          "email": "myEmail@logic-square.com",
          "phone": "00000000000",
          "name"  : {
            "first":"Jhon",
            "last" :"Doe"
          }
        }
      }
    *
    *
  */
  async get(req, res) {
    try {
      const user = await User.findOne({
        _id: req.user.id
      })
        .select("-password -forgotpassword")
        .exec()
      if (user === null) throw new Error("No user found for the given id")
      return res.json({
        error: false,
        user
      })
    } catch (err) {
      console.log("error", err)
      return res.status(500).json({
        error: true,
        reason: err.message
      })
    }
  },

  /**
    *
    * @api {get} /user/:id 2.0 get user by Id
    * @apiName userById
    * @apiGroup User
    * @apiVersion  1.0.0
    * @apiPermission User
    *
    * @apiHeader {String} Authorization The JWT Token in format "Bearer xxxx.yyyy.zzzz"
    *
    * @apiParam {String} id `URL Param` _id of the user
    *
    * @apiSuccessExample {type} Success-Response:
      {
        "error" : false,
        "user" : {
          "email": "myEmail@logic-square.com",
          "phone": "00000000000",
          "name"  : {
            "first":"Jhon",
            "last" :"Doe"
          }
        }
      }
    *
    *
  */

  async getById(req, res) {
    try {
      if (req.user.isAdmin !== true) {
        return res
          .status(400)
          .json({ error: true, reason: "You are not authorized to perform this action." })
      }

      const user = await User.findOne({
        _id: req.params.id
      })
        .select("-password -forgotpassword")
        .exec()
      if (user === null) throw new Error("No user found for the given id")
      return res.json({
        error: false,
        user
      })
    } catch (err) {
      return res.status(500).json({
        error: true,
        reason: err.message
      })
    }
  },
  /**
    *
    * @api {post} /users get all users details
    * @apiName userAllUsers
    * @apiGroup User
    * @apiVersion  1.0.0
    * @apiPermission User
    *
    * @apiHeader {String} Authorization The JWT Token in format "Bearer xxxx.yyyy.zzzz"
    *
    * @apiParam  {String} [page=1] Which page in the paginated list of docs
    * @apiParam  {String} [limit=10] How many docs to show per page
    *
    *
    * @apiSuccessExample {type} Success-Response:
      {
        "error" : false,
        "user" : {
          "email": "myEmail@logic-square.com",
          "phone": "00000000000",
          "name"  : {
            "first":"Jhon",
            "last" :"Doe"
          }
        }
      }
    *
    *
  */
  async getAll(req, res) {
    try {
      const {
        page = 1, limit = 10
      } = req.body

      if (req.user.isAdmin !== true) {
        return res
          .status(400)
          .json({ error: true, reason: "You are not authorized to perform this action." })
      }

      const query = { isAdmin: false }
      const users = await User.find(query)
        .select("-password -forgotpassword")
        .populate("_refferBy", "name")
        .sort({ createdAt: -1 })
        .skip((Number(page) - 1) * Number(limit))
        .limit(Number(limit))
        .exec()
      const total = await User.countDocuments(query)
      return res.json({
        error: false,
        users,
        total
      })
    } catch (err) {
      return res.status(500).json({
        error: true,
        reason: err.message
      })
    }
  },

  /**
    *
    * @api {put} /user/:id update user details by Id
    * @apiName updateUser
    * @apiGroup User
    * @apiVersion  1.0.0
    * @apiPermission User
    *
    * @apiHeader {String} Authorization The JWT Token in format "Bearer xxxx.yyyy.zzzz"
    *
    * @apiParam {String} id `URL Param` _id of the user
    *
    * @apiParam  {String} email the new email of the user
    * @apiParam  {String} instaUsername the new instaUsername of the user
    * @apiParam  {String} name the new name of the user
    * @apiParam  {String} amountPaid
    * @apiParam  {String} _refferBy
    *
    *
    * @apiSuccessExample {type} Success-Response:
      {
        "error" : false,
        "user" : {
          "email": "myEmail@logic-square.com",
          "phone": "00000000000",
          "name"  : {
            "first":"Jhon",
            "last" :"Doe"
          }
        }
      }
    *
    *
  */
  async put(req, res) {
    try {
      const { id } = req.params
      const {
        email, instaUsername, name, amountPaid, _refferBy
      } = req.body

      const user = await User.findOne({ _id: id }).exec()
      if (user === null) throw new Error("No user found for the given id")

      if (email !== undefined && email !== "") {
        const existingUser = await User.countDocuments({ email })
        if (existingUser > 0 && email !== user.email) {
          throw new Error("User already exists")
        }
        user.email = email
      }
      if (instaUsername !== undefined && instaUsername !== "") {
        const existingUser = await User.countDocuments({ instaUsername })
        if (existingUser > 0 && instaUsername !== user.instaUsername) {
          throw new Error("User already exists")
        }
        user.instaUsername = instaUsername
      }
      if (name !== undefined && name !== "") user.name = name
      if (amountPaid !== undefined && amountPaid !== "") user.amountPaid = amountPaid
      if (_refferBy !== undefined && _refferBy !== "") user._refferBy = _refferBy

      await user.save()

      return res.status(200).json({
        error: false,
        user
      })
    } catch (err) {
      return res.status(500).json({
        error: true,
        reason: err.message
      })
    }
  },

  /**
    *
    * @api {get} /resend/email/:id resend the invitation mail
    * @apiName resendEmail
    * @apiGroup User
    * @apiVersion  1.0.0
    * @apiPermission User
    *
    * @apiHeader {String} Authorization The JWT Token in format "Bearer xxxx.yyyy.zzzz"
    *
    * @apiParam {String} id `URL Param` _id of the user
    *
  */
  async resendEmail(req, res) {
    try {
      const { id } = req.params
      const user = await User.findOne({ _id: id }).exec()
      const generatedPassword = randomstring.generate(8)
      user.password = generatedPassword
      await user.save()

      mailer("welcome", {
        to: user.email,
        subject: "Welcome!!!",
        locals: {
          email: user.email, password: generatedPassword, name: user.name, downloadLink: `${process.env.SITE_URL}/api/v1/download`
        },
      })

      return res.status(200).json({
        error: false
      })
    } catch (err) {
      return res.status(500).json({
        error: true,
        reason: err.message
      })
    }
  }
}
