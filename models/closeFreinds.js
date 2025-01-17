/* eslint-disable max-len */
/* eslint-disable no-useless-catch */
const mongoose = require("mongoose")

const closeFreindSchema = new mongoose.Schema({
  name: {
    type: String
  },
  instaUsername: { // unique not applicable for this field same user maybe add diffrent system user
    type: String
  },

  pk: {
    type: String
  },
  _closeFreindsWith: {
    ref: "User",
    type: mongoose.Schema.Types.ObjectId
  },
  isMarkedAsCloseFreind: {
    type: Boolean,
    default: false
  },
  userInstaUserName: { // add this if same user user multi insta account
    type: String
  },
  notFound: {
    type: Boolean,
    default: false
  }
})

closeFreindSchema.set("timestamps", true)
closeFreindSchema.set("toJSON", { virtuals: true })
closeFreindSchema.set("toObject", { virtuals: true })

module.exports = mongoose.model("closeFreindSchema", closeFreindSchema)
