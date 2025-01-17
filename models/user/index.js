/* eslint-disable max-len */
/* eslint-disable no-useless-catch */
const mongoose = require("mongoose")
const bcrypt = require("bcrypt")
const randomstring = require("randomstring")
const path = require("path")
const mailer = require("../../lib/mail")

const UserSchema = new mongoose.Schema({

  instaUsername: {
    type: String,
    unique: true
  },

  _refferBy: {
    ref: "User",
    type: mongoose.Schema.Types.ObjectId
  },

  amountPaid: Number,

  totalLimit: {
    type: Number,
    default: 100000
  },

  usedLimit: {
    type: Number,
    default: 0
  },

  isDeviceAdded: {
    type: Boolean,
    default: false
  },

  fakeDeviceDetails: {
    deviceId: String,
    uuid: String,
    phoneId: String,
    adid: String,
    deviceString: String,
    build: String
  },

  dayLimit: {
    type: Number,
    default: 10000
  },

  addTodayCount: {
    type: Number,
    default: 0
  },

  sessionData: { type: mongoose.Schema.Types.Mixed },

  lastCountUpdateDate: {
    type: Date,
    default: Date.now
  },

  historyDetails: [{
    noOfFriend: Number,
    dateTime: Date
  }],

  password: {
    type: String,
    required: true
  },

  name: String,

  email: {
    type: String,
    lowercase: true,
    unique: true,
  },

  phone: {
    type: String
  },

  gender: {
    type: String,
    enum: ["Male", "Female", "Other"],
  },

  isActive: {
    type: Boolean,
    default: true
  },

  isAdmin: {
    type: Boolean,
    default: false
  },

  forgotpassword: {
    requestedAt: { type: Date, default: null },
    token: { type: String, default: null },
    expiresAt: { type: Date, default: null }
  },

  totalFreindsAdded: {
    type: Number,
    default: 0
  },

  totalCloseFreindsMarked: {
    type: Number,
    default: 0
  }
})

UserSchema.pre("validate", function (next) {
  if (this.isNew) {
    if (this.password === undefined || this.password === null) {
      this.generatedPassword = randomstring.generate(8) // for usage in post save hook to send welcome email
      this.password = this.generatedPassword
    } else {
      this.generatedPassword = this.password
    }
  }
  return next()
})

// Hash & save user's password:
UserSchema.pre("save", async function (next) {
  const user = this
  if (this.isModified("password") || this.isNew) {
    try {
      user.password = await bcrypt.hash(user.password, +process.env.SALT_ROUNDS || 10)
    } catch (error) {
      return next(error)
    }
  }
  return next()
})

// compare two passwords:
UserSchema.methods.comparePassword = async function (pw) {
  try {
    const isMatch = await bcrypt.compare(pw, this.password)
    if (isMatch === false) throw new Error("Please check your credentials and try again")
  } catch (error) {
    throw error // rethrow
  }
}
// eslint-disable-next-line prefer-arrow-callback
UserSchema.post("save", function (doc) {
  if (doc.generatedPassword !== undefined) {
    // Send welcome email, but NO WAITING!
    try {
      mailer("welcome", {
        to: doc.email,
        subject: "Welcome!!!",
        locals: {
          email: doc.email, password: doc.generatedPassword, name: doc.name, downloadLink: `${process.env.SITE_URL}/api/v1/download`
        },
      })
    } catch (error) {
      console.log("Error sending mail", error)
    }
  }
})

UserSchema.set("timestamps", true)
UserSchema.set("toJSON", { virtuals: true })
UserSchema.set("toObject", { virtuals: true })

module.exports = mongoose.model("User", UserSchema)
