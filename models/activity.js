const mongoose = require("mongoose")

const ActivitySchema = new mongoose.Schema({

  activityType: {
    type: String,
    enum: ["uploadJson", "closeFreindsAdded", "closeFreindsRequired"]
  },

  _user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },

  closeFreindAdded: {
    type: Number,
  },

  noOfFollowers: {
    type: Number
  },

  freindsToBeAdded: {
    type: Number
  },

  text: String
})

ActivitySchema.set("timestamps", true)
ActivitySchema.set("toJSON", { virtuals: true })
ActivitySchema.set("toObject", { virtuals: true })

module.exports = mongoose.model("Activity", ActivitySchema)
