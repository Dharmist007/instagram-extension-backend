/* eslint-disable max-len */
const User = require("../../../models/user")

module.exports = {
  /**
    *
    * @api {post} /signup User registration
    * @apiName userRegistration
    * @apiGroup Auth
    * @apiVersion  1.0.0
    * @apiPermission Public
    *
    *
    * @apiParam  {String} email
    * @apiParam  {String} [phone]
    * @apiParam  {Object} name
    * @apiParam  {String} [instaUsername]
    * @apiParam  {String} [_refferBy] reffer user id
    * @apiParam  {String} [amountPaid]
    *
    * @apiSuccess (200) {json} name description
    *
    * @apiParamExample  {json} Request-Example:
      {
        "email": "myEmail@logic-square.com",
        "phone": "00000000000",
        "name": "kiran debnath",
        "password": "myPassword",
        "instaUsername": "myInstaUsername",
        "noOfCloseFriendBalance": 50000,
        "gender": "Male"
      }
    *
    * @apiSuccessExample {json} Success-Response:
      {
        "error": false,
        "user": {
          "email": "myEmail@logic-square.com",
          "phone": "00000000000",
          "name": {
            "first":"Jhon",
            "last" :"Doe"
          }
        }
      }
    *
    *
    */
  async post(req, res) {
    try {
      const {
        email, phone, name, instaUsername, _refferBy, amountPaid
      } = req.body
      if (email === undefined) {
        return res
          .status(400)
          .json({ error: true, reason: "Missing manadatory field `email`" })
      }

      if (name === undefined) {
        return res
          .status(400)
          .json({ error: true, reason: "Please specify Name!" })
      }

      if (req.user.isAdmin !== true) {
        return res
          .status(400)
          .json({ error: true, reason: "You are not authorized to perform this action." })
      }

      const existingEmailUser = await User.countDocuments({ email })
      if (existingEmailUser > 0) {
        throw new Error("User already exists for the the given email id")
      }

      if (instaUsername !== undefined && instaUsername !== "") {
        const existingUser = await User.countDocuments({ instaUsername })
        if (existingUser > 0) {
          throw new Error("User already exists for the given instaUsername")
        }
      }
      if (_refferBy !== undefined && _refferBy !== "") {
        const refferBy = await User.findOne({ _id: _refferBy }).exec()
        if (refferBy === null) throw new Error("No user found for the given _refferBy")
      }

      const userObj = {
        email,
        phone,
        name,
        instaUsername,
        amountPaid
      }

      if (_refferBy !== "" && _refferBy !== undefined && _refferBy !== null) {
        userObj._refferBy = _refferBy
      }
      const user = await User.create(userObj)

      return res.json({ error: false, user })
    } catch (err) {
      console.log("err", err)
      return res.status(500).json({ error: true, reason: err.message })
    }
  }
}
