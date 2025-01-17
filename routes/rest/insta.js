/* eslint-disable consistent-return */
/* eslint-disable no-restricted-syntax */
/* eslint-disable max-len */
/* eslint-disable no-console */
const fs = require("fs/promises")
const moment = require("moment")
const path = require("path")
const { IgApiClient } = require("instagram-private-api")
const User = require("../../models/user")
const CloseFreind = require("../../models/closeFreinds")
const { parseCSV } = require("../../lib/csv")
const Activity = require("../../models/activity")

module.exports = {
  /**
    *
    * @api {post} /start/make/closefriend login user start the make close friend process
    * @apiName userDetails
    * @apiGroup User
    * @apiVersion  1.0.0
    * @apiPermission User
    *
    * @apiHeader {String} Authorization The JWT Token in format "Bearer xxxx.yyyy.zzzz"
    *
    * @apiParam {String} instaUsername user insta id
    * @apiParam {String} instaPassword
    * @apiParam {Number} noOfAction
    * @apiParam {Boolean} [addFromCSV=false] if true then need file else fetch from user follower list
    *
    * @apiSuccess (200) {json} name description
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
  async addFriend(req, res) {
    try {
      const {
        instaUsername, instaPassword, noOfAction, addFromCSV = false
      } = req.body
      const ig = new IgApiClient()

      let user = await User
        .findOne({
          _id: req.user.id, isActive: true
        })
        .select("-password -forgotpassword")
        .exec()
      if (user === null) throw new Error("Login user account issue found")
      // eslint-disable-next-line max-len
      if (user.instaUsername !== undefined && instaUsername !== undefined && user.instaUsername !== instaUsername) {
        throw new Error("Please use your connected insta account username")
      }
      if (user.instaUsername === undefined && instaUsername === undefined) {
        throw new Error("Missing field instaUsername")
      }
      if (instaPassword === undefined) {
        throw new Error("Missing field instaPassword")
      }
      if (noOfAction === undefined) {
        throw new Error("Missing field noOfAction")
      }

      if (user.totalLimit - user.usedLimit < noOfAction) {
        throw new Error("You don't have that much of balance in your account")
      }
      if (user.lastCountUpdateDate !== undefined && moment().isSame(user.lastCountUpdateDate, "day")) {
        if (user.dayLimit - user.addTodayCount < noOfAction) {
          throw new Error("You don't have that much of balance for today")
        }
      }
      if (user.instaUsername === undefined && instaUsername !== undefined) {
        user.instaUsername = instaUsername
      }

      console.log("*****", instaUsername, instaPassword)

      let freshUserIds
      let csvUsernames

      // generate device

      let needToCreateSession = true
      let userID

      if (user.sessionData !== undefined && user.sessionData !== "") {
        console.log("111111111", JSON.stringify(user.sessionData))
        const jsonData = JSON.stringify(user.sessionData)
        const abc = await ig.state.deserialize(JSON.parse(jsonData))
        needToCreateSession = false
        userID = ig.state.cookieUserId
        console.log("222222222", abc)
        ig.state.generateDevice(user.instaUsername)
        if (user.isDeviceAdded === true) {
          console.log("----+++++++++------11111111--")
          // ig.state.generateDevice("insta_pixel_details")
          ig.state.deviceId = user.fakeDeviceDetails.deviceId
          ig.state.uuid = user.fakeDeviceDetails.uuid
          ig.state.phoneId = user.fakeDeviceDetails.phoneId
          ig.state.adid = user.fakeDeviceDetails.adid
          ig.state.deviceString = user.fakeDeviceDetails.deviceString
          ig.state.build = user.fakeDeviceDetails.build
        } else {
          console.log("-------2222222222-----")
          user.fakeDeviceDetails = {}
          user.fakeDeviceDetails.isDeviceAdded = true
          user.fakeDeviceDetails.deviceId = ig.state.deviceId
          user.fakeDeviceDetails.uuid = ig.state.uuid
          user.fakeDeviceDetails.phoneId = ig.state.phoneId
          user.fakeDeviceDetails.adid = ig.state.adid
          user.fakeDeviceDetails.deviceString = ig.state.deviceString
          user.fakeDeviceDetails.build = ig.state.build
          user.isDeviceAdded = true
          user = await user.save()
        }
        // here user promise.allsettled if data not found then need to replace the login session data
        const response = await Promise.allSettled([ig.account.currentUser()]) // Get current page
        console.log("333333333", response)
        if (response[0].status === "rejected") {
          needToCreateSession = true
          user.sessionData = ""
        }
        // console.log('Session Validated:', selfInfo)
      }

      if (needToCreateSession === true) {
        ig.state.generateDevice(user.instaUsername)
        if (user.isDeviceAdded === true) {
          console.log("44444444444")
          ig.state.deviceId = user.fakeDeviceDetails.deviceId
          ig.state.uuid = user.fakeDeviceDetails.uuid
          ig.state.phoneId = user.fakeDeviceDetails.phoneId
          ig.state.adid = user.fakeDeviceDetails.adid
          ig.state.deviceString = user.fakeDeviceDetails.deviceString
          ig.state.build = user.fakeDeviceDetails.build
        } else {
          console.log("----------55555555--")
          user.fakeDeviceDetails = {}
          user.fakeDeviceDetails.isDeviceAdded = true
          user.fakeDeviceDetails.deviceId = ig.state.deviceId
          user.fakeDeviceDetails.uuid = ig.state.uuid
          user.fakeDeviceDetails.phoneId = ig.state.phoneId
          user.fakeDeviceDetails.adid = ig.state.adid
          user.fakeDeviceDetails.deviceString = ig.state.deviceString
          user.fakeDeviceDetails.build = ig.state.build
          user.isDeviceAdded = true
          user = await user.save()
        }
        await ig.simulate.preLoginFlow()
        const auth = await ig.account.login(instaUsername, instaPassword)
        ig.request.end$.subscribe(async () => {
          const serialized = await ig.state.serialize()
          delete serialized.constants
          console.log("----------666666666--", serialized)
          // user.sessionData = serialized
          user.sessionData = JSON.stringify(serialized)
        })
        user.save()

        // const loggedInUser = await ig.account.login('kname50', 'Insta@654321')
        // const auth = await ig.account.login("insta_pixel_details", "Logic@123456")
        userID = auth.pk
        console.log("----------777777777--", auth)
      } else {
        ig.state.generateDevice(user.instaUsername)
        if (user.isDeviceAdded === true) {
          console.log("----+++++++++--------")
          // ig.state.generateDevice("insta_pixel_details")
          ig.state.deviceId = user.fakeDeviceDetails.deviceId
          ig.state.uuid = user.fakeDeviceDetails.uuid
          ig.state.phoneId = user.fakeDeviceDetails.phoneId
          ig.state.adid = user.fakeDeviceDetails.adid
          ig.state.deviceString = user.fakeDeviceDetails.deviceString
          ig.state.build = user.fakeDeviceDetails.build
        } else {
          console.log("------------")
          user.fakeDeviceDetails = {}
          user.fakeDeviceDetails.isDeviceAdded = true
          user.fakeDeviceDetails.deviceId = ig.state.deviceId
          user.fakeDeviceDetails.uuid = ig.state.uuid
          user.fakeDeviceDetails.phoneId = ig.state.phoneId
          user.fakeDeviceDetails.adid = ig.state.adid
          user.fakeDeviceDetails.deviceString = ig.state.deviceString
          user.fakeDeviceDetails.build = ig.state.build
          user.isDeviceAdded = true
          user = await user.save()
        }
      }

      if (addFromCSV === true || addFromCSV === "true") {
        if (!req.file) {
          return res.status(400).json({ error: "No file uploaded" })
        }
        const filePath = `./uploads/${req.file.filename}`
        const data = await parseCSV(filePath)

        csvUsernames = data.reduce((acc, cur) => {
          const closeFreind = {}
          closeFreind.instaUsername = cur.username
          closeFreind.pk = cur.pk
          closeFreind.name = cur.full_name
          closeFreind._closeFreindsWith = req.user.id
          closeFreind.userInstaUserName = instaUsername
          acc.push(closeFreind)
          return acc
        }, [])

        const csvFriendIds = csvUsernames.map((el) => el.pk)
        let csvFriendCheck = await CloseFreind
          .find({ $in: { pk: csvFriendIds }, _closeFreindsWith: req.user.id, userInstaUserName: instaUsername })
          .select("pk")
          .exec()
        csvFriendCheck = csvFriendCheck.map((frnd) => frnd.pk)
        freshUserIds = csvFriendIds.filter((el) => !csvFriendCheck.includes(el))
        if (freshUserIds.length > noOfAction) {
          freshUserIds.length = noOfAction
        }
        csvUsernames = csvUsernames.filter((ele) => freshUserIds.includes(ele.pk))
      } else {
        // const followersFeed = ig.feed.accountFollowers(2203072164)
        const followersFeed = ig.feed.accountFollowers(userID)
        console.log("****", followersFeed)

        let allFollowers = []
        let page = 1

        // Fetch followers with pagination
        do {
          // eslint-disable-next-line no-await-in-loop
          let followers = await followersFeed.items() // Get current page
          console.log(`Page ${page}: Retrieved ${followers.length} followers`)

          // Process each follower
          followers.forEach((follower) => {
            console.log(`Follower: ${follower.username}`)
          })

          const curPageUserIds = followers.map((follower) => follower.pk)

          // eslint-disable-next-line no-await-in-loop
          let dbFriendCheck = await CloseFreind
            .find({ $in: { pk: curPageUserIds }, _closeFreindsWith: req.user.id, instaUsername })
            .select("pk")
            .exec()
          dbFriendCheck = dbFriendCheck.map((frnd) => frnd.pk)
          followers = followers.filter((el) => !dbFriendCheck.includes(el.pk))
          allFollowers = allFollowers.concat(followers) // Append to the list
          page += 1
        } while (followersFeed.isMoreAvailable() && allFollowers.length < noOfAction) // Check if more pages are available

        console.log(`Total Followers Retrieved: ${allFollowers.length}`)
        csvUsernames = allFollowers.reduce((acc, cur) => {
          const closeFreind = {}
          closeFreind.instaUsername = cur.username
          closeFreind.pk = cur.pk
          closeFreind.name = cur.full_name
          closeFreind._closeFreindsWith = req.user.id
          closeFreind.userInstaUserName = instaUsername
          acc.push(closeFreind)
          return acc
        }, [])
        if (csvUsernames.length > noOfAction) {
          csvUsernames.length = noOfAction
        }
        freshUserIds = csvUsernames.map((e) => e.pk)
      }

      user.save()
      // [45645898548, 55549973451, 53707915622, 59338860236, 59564903082] // add 6 random friends
      const addedData = await ig.friendship.setBesties({
        add: freshUserIds,
        remove: []
      })
      console.log(`Added ${noOfAction} to close friends.`)
      if (user.lastCountUpdateDate === undefined && moment().isSame(user.lastCountUpdateDate, "day")) {
        user.addTodayCount += freshUserIds.length
      } else {
        user.addTodayCount = freshUserIds.length
      }
      user.usedLimit += freshUserIds.length
      user.lastCountUpdateDate = moment().toDate()
      user.save()
      await CloseFreind.insertMany(csvUsernames)
      return res.json({
        error: false,
        message: `${freshUserIds.length} friends added`
      })
    } catch (err) {
      console.log("******", err)
      return res.status(500).json({
        error: true,
        reason: err.message
      })
    }
  },

  async uploadCsv(req, res) {
    try {
      // console.log("req.body", req.body)
      // console.log("req.file", req.file)
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" })
      }

      const { noOfAction } = req.body
      // console.log("noOfAction", noOfAction)
      const filePath = `./uploads/${req.file.filename}`
      const data = await parseCSV(filePath)

      const closeFreindsSet = new Set()
      const closeFreindsInstaUsernames = []
      const csvFriendIds = []
      data.forEach((cur) => {
        const closeFreind = {
          instaUsername: cur.username,
          pk: cur.pk,
          name: cur.full_name,
          // _closeFreindsWith: req.user.id,
        }

        closeFreindsInstaUsernames.push(cur.username)
        closeFreindsSet.add(JSON.stringify(closeFreind)) // Add serialized object to the Set
        csvFriendIds.push(cur.pk)
        // console.log("closeFreind", closeFreind)
      })

      // console.log("closeFreindsInstaUsernames", closeFreindsInstaUsernames)

      let existingCloseFreindsInstaUsernames = []
      const existingCloseFreinds = await CloseFreind.find({
        $in: { pk: csvFriendIds },
        instaUsername: { $in: closeFreindsInstaUsernames },
        _closeFreindsWith: req.user.id
      })

      if (existingCloseFreinds && existingCloseFreinds.length > 0) {
        // console.log("existingCloseFreinds", existingCloseFreinds)
        existingCloseFreindsInstaUsernames = existingCloseFreinds.map((cur) => cur.instaUsername)
      }

      const finalCloseFreindsSet = new Set()
      for (const serializedCloseFreind of closeFreindsSet) {
        const closeFreind = JSON.parse(serializedCloseFreind)
        if (!existingCloseFreindsInstaUsernames.includes(closeFreind.instaUsername)) {
          finalCloseFreindsSet.add(serializedCloseFreind)
        }
      }

      const finalCloseFreinds = Array.from(finalCloseFreindsSet).map((serializedCloseFreind) => JSON.parse(serializedCloseFreind))
      if (finalCloseFreinds.length > noOfAction) {
        finalCloseFreinds.length = noOfAction
      }
      // console.log("finalCloseFreinds", finalCloseFreinds)
      // console.log("finalCloseFreinds.length", finalCloseFreinds.length)

      // await CloseFreind.insertMany(finalCloseFreinds)

      // Remove the file after processing
      fs.unlink(filePath)

      return res.json({
        message: "File uploaded successfully",
        file: req.file,
        instausersname: finalCloseFreinds,
      })
    } catch (err) {
      if (req.file) {
        try {
          await fs.unlink(`./uploads/${req.file.filename}`)
        } catch (removeError) {
          console.error("Failed to remove file:", removeError)
        }
      }
      console.error("Error:", err)
      return res.status(500).json({
        error: true,
        reason: err.message,
      })
    }
  },

  /**
    *
    * @api {post} /closefreind/added update the db with close freind marked
    * @apiName closeFreindAdded
    * @apiGroup User
    * @apiVersion  1.0.0
    * @apiPermission User
    *
    * @apiHeader {String} Authorization The JWT Token in format "Bearer xxxx.yyyy.zzzz"
    *
    * @apiParam {String} closeFreindAdded
    * @apiParam {String} profileName
    * @apiParam {Boolean} lastCall
    * @apiParam {Number} noOfActions
    *
    *
    * @apiSuccessExample {type} Success-Response:
    *  {
    *    "error" : false
    *  }
    *
    *
  */
  async closeFreindAdded(req, res) {
    try {
      // console.log("req.body", req.body)
      const {
        closeFreindAdded, profileName
      } = req.body

      const user = await User
        .findOne({
          _id: req.user.id, isActive: true
        })
        .select("-password -forgotpassword")
        .exec()

      if (user === null) throw new Error("Login user account issue found")

      await CloseFreind.updateOne({
        instaUsername: closeFreindAdded,
        _closeFreindsWith: req.user.id
      }, { isMarkedAsCloseFreind: true, userInstaUserName: profileName })

      user.totalCloseFreindsMarked += 1

      if (moment().isSame(user.lastCountUpdateDate, "day")) {
        user.addTodayCount += 1
      } else {
        user.addTodayCount = 1
      }
      user.lastCountUpdateDate = moment().toDate()
      await user.save()
      let instaName
      let listExhauted = false
      if (user.lastCountUpdateDate !== undefined && moment().isSame(user.lastCountUpdateDate, "day")) {
        if (user.addTodayCount >= user.dayLimit) {
          instaName = ""
        } else {
          const nextFreindToBeMarked = await CloseFreind.findOne({ _closeFreindsWith: req.user.id, isMarkedAsCloseFreind: false }).exec()
          if (nextFreindToBeMarked !== null) {
            instaName = nextFreindToBeMarked.instaUsername
          } else listExhauted = true
        }
      }
      // if (lastCall === true) {
      //   await Activity.create({
      //     _user: req.user.id,
      //     activityType: "closeFreindsAdded",
      //     closeFreindAdded: Number(noOfActions)
      //   })
      // }
      return res.json({ error: false, instausersname: instaName, listExhauted })
    } catch (error) {
      console.log("error", error)
      return res.json({ error: true })
    }
  },

  /**
    *
    * @api {post} /upload/json upload json file containg followers
    * @apiName uploadJson
    * @apiGroup User
    * @apiVersion  1.0.0
    * @apiPermission User
    *
    * @apiHeader {String} Authorization The JWT Token in format "Bearer xxxx.yyyy.zzzz"
    *
    * @apiParam {file} file
    *
    *
    * @apiSuccessExample {type} Success-Response:
      {
        "error" : false
      }
    *
    *
  */
  async uploadJson(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" })
      }

      // const { noOfAction } = req.body
      // console.log("noOfAction", noOfAction)
      const filePath = `./uploads/${req.file.filename}`
      // console.log("file name", req.file.filename)

      const data = await fs.readFile(filePath, "utf-8")
      const jsonData = JSON.parse(data)
      // console.log("Uploaded JSON:", jsonData)

      const closeFreindsSet = new Set()
      const closeFreindsInstaUsernames = []
      // const csvFriendIds = []
      jsonData.forEach((cur) => {
        const closeFreind = {
          instaUsername: cur.string_list_data[0].value,
          _closeFreindsWith: req.user.id
        }

        closeFreindsInstaUsernames.push(cur.string_list_data[0].value)
        closeFreindsSet.add(JSON.stringify(closeFreind)) // Add serialized object to the Set
        // csvFriendIds.push(cur.pk)
        // console.log("closeFreind", closeFreind)
      })

      let existingCloseFreindsInstaUsernames = []
      const existingCloseFreinds = await CloseFreind.find({
        instaUsername: { $in: closeFreindsInstaUsernames },
        _closeFreindsWith: req.user.id
      })

      if (existingCloseFreinds && existingCloseFreinds.length > 0) {
        // console.log("existingCloseFreinds", existingCloseFreinds)
        existingCloseFreindsInstaUsernames = existingCloseFreinds.map((cur) => cur.instaUsername)
      }

      // console.log("existingCloseFreindsInstaUsernames", existingCloseFreindsInstaUsernames)

      const finalCloseFreindsSet = new Set()
      for (const serializedCloseFreind of closeFreindsSet) {
        const closeFreind = JSON.parse(serializedCloseFreind)
        if (!existingCloseFreindsInstaUsernames.includes(closeFreind.instaUsername)) {
          finalCloseFreindsSet.add(serializedCloseFreind)
        }
      }
      const finalCloseFreinds = Array.from(finalCloseFreindsSet).map((serializedCloseFreind) => JSON.parse(serializedCloseFreind))
      // if (finalCloseFreinds.length > noOfAction) {
      //   finalCloseFreinds.length = noOfAction
      // }

      await CloseFreind.insertMany(finalCloseFreinds)
      Activity.create({
        activityType: "uploadJson",
        _user: req.user.id,
        noOfFollowers: finalCloseFreinds.length
      })

      const user = await User.findOne({ _id: req.user.id }).exec()
      const totalFreindsAdded = user.totalFreindsAdded + finalCloseFreinds.length
      await User.updateOne({ _id: req.user.id }, { $set: { totalFreindsAdded } })
      fs.unlink(filePath)
      return res.json({ error: false })
    } catch (error) {
      console.log("error", error)
      return res.status(500).json({ error: true })
    }
  },
  /**
    *
    * @api {post} /get/freinds/list get freinds list for adding through the extension
    * @apiName getFreindsList
    * @apiGroup User
    * @apiVersion  1.0.0
    * @apiPermission User
    *
    * @apiHeader {String} Authorization The JWT Token in format "Bearer xxxx.yyyy.zzzz"
    *
    * @apiParam {Number} noOfActions
    *
    * @apiSuccessExample {type} Success-Response:
      {
        "error" : false,
        "instausersname": []
      }
    *
    *
  */
  async getFreindsList(req, res) {
    try {
      const { noOfActions } = req.body

      const user = await User.findOne({ _id: req.user.id }).select("dayLimit").exec()
      if (user.lastCountUpdateDate !== undefined && moment().isSame(user.lastCountUpdateDate, "day")) {
        if (user.dayLimit - user.addTodayCount < noOfActions) {
          return res.status(400).json({ error: true, reason: "You don't have that much of balance for today" })
        }
      }

      const closeFreinds = await CloseFreind.find({ _closeFreindsWith: req.user.id, isMarkedAsCloseFreind: false })

      const instausersname = closeFreinds.map((ele) => ele.instaUsername)

      // console.log(" noOfActions", noOfActions)

      if (instausersname.length > noOfActions) {
        instausersname.length = noOfActions
      }
      // console.log("instausersname.length ", instausersname.length)

      Activity.create({
        freindsToBeAdded: noOfActions,
        _user: req.user.id,
        activityType: "closeFreindsRequired"
      })

      return res.json({ error: false, instausersname })
    } catch (error) {
      console.log("error", error)
      return res.json({ error: true })
    }
  },

  /**
    *
    * @api {post} /get/activities fetch activities
    * @apiName getActivities
    * @apiGroup User
    * @apiVersion  1.0.0
    * @apiPermission User
    *
    * @apiHeader {String} Authorization The JWT Token in format "Bearer xxxx.yyyy.zzzz"
    *
    * @apiParam {Number} page
    * @apiParam {Number} limit
    *
    * @apiSuccessExample {type} Success-Response:
      {
        "error" : false,
        "activities": [
          {
            activityType: "",
            _user: "",
            closeFreindAdded: "",
            noOfFollowers: "",
            freindsToBeAdded: ""
          }
        ],
        "totalCount": 0
      }
    *
    *
  */
  async getActivities(req, res) {
    try {
      const { page = 1, limit = 10 } = req.body
      const skip = (page - 1) * limit
      const [activities, totalCount] = await Promise.all([
        Activity.find({ _user: req.user.id }).sort({ createdAt: -1 }).skip(skip).limit(limit)
          .exec(),
        Activity.countDocuments({ _user: req.user.id })
      ])
      return res.json({ error: false, activities, totalCount })
    } catch (error) {
      console.log("error", error)
      return res.json({ error: true })
    }
  },

  /**
    *
    * @api {get} /get/freind fetch a single freind's username who has not been marked
    * @apiName getFreind
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
        "instausersname": ""
      }
    *
    *
  */
  async getFreind(req, res) {
    try {
      const user = await User.findOne({ _id: req.user.id }).exec()
      if (user.lastCountUpdateDate !== undefined && moment().isSame(user.lastCountUpdateDate, "day")) {
        if (user.addTodayCount >= user.dayLimit) {
          return res.status(400).json({ error: true, reason: "You have reached the daily limit for today" })
        }
      }

      const closeFreind = await CloseFreind.findOne({ _closeFreindsWith: req.user.id, isMarkedAsCloseFreind: false, notFound: { $ne: true } }).exec()

      if (closeFreind === null) return res.status(400).json({ error: true, listExhausted: true, reason: "You have exhausted the list of close freinds" })
      const instausersname = closeFreind.instaUsername

      // Activity.create({
      //   freindsToBeAdded: noOfActions,
      //   _user: req.user.id,
      //   activityType: "closeFreindsRequired"
      // })

      return res.json({ error: false, instausersname })
    } catch (error) {
      console.log("error", error)
      return res.json({ error: true })
    }
  },

  /**
    *
    * @api {get} /download download the chrome extension
    * @apiName downloadFile
    * @apiGroup User
    * @apiVersion  1.0.0
    * @apiPermission User
    *
    *
    * @apiSuccessExample {type} Success-Response:
      {
        "error" : false,
      }
    *
    *
  */
  async downloadFile(req, res) {
    try {
      const filePath = path.join(__dirname, "..", "..", "chromeExtension.zip") // Replace "example.zip" with your file name
      console.log("filePath", filePath)
      // Send the file to the client
      // res.set("Content-Type", "application/zip")
      res.download(filePath, "chromeExtension.zip", (err) => {
        if (err) {
          console.error(`Error downloading file: ${err.message}`)
          return res.status(500).send("Error downloading the file.")
        }
      })
      // return res.status(200).json({ error: false })
    } catch (error) {
      console.log("error", error)
      return res.status(400).json({ error: true, reason: error.message })
    }
  },

  /**
    *
    * @api {post} /closefreind/not/found update the close freind which was not found
    * @apiName closeFreindNotFound
    * @apiGroup User
    * @apiVersion  1.0.0
    * @apiPermission User
    *
    * @apiHeader {String} Authorization The JWT Token in format "Bearer xxxx.yyyy.zzzz"
    *
    * @apiParam {String} closeFreind insta username of the freind
    *
    * @apiSuccessExample {type} Success-Response:
      {
        "error" : false,
      }
    *
    *
  */
  async closeFreindNotFound(req, res) {
    try {
      const { closeFreind } = req.body
      await CloseFreind.updateOne({
        instaUsername: closeFreind,
        _closeFreindsWith: req.user.id
      }, { notFound: true })

      return res.json({ error: false })
    } catch (error) {
      console.log("error", error)
      return res.json({ error: true })
    }
  },

  async rectifyData(req, res) {
    try {
      // const closeFreinds = await CloseFreind.find()
      const closeFreinds = await CloseFreind.aggregate([
        {
          $group: {
            _id: "$_closeFreindsWith",
            details: {
              $push: {
                instaUsername: "$instaUsername",
                isMarkedAsCloseFreind: "$isMarkedAsCloseFreind"
              }
            }
          }
        }
      ])
      const userUpdatePromise = []
      closeFreinds.forEach((closeFreind) => {
        userUpdatePromise.push(User.updateOne({ _id: closeFreind._id }, { $set: { totalFreindsAdded: closeFreind.details.length } }))
      })

      await Promise.all(userUpdatePromise)
      return res.json({ error: false, closeFreinds })
    } catch (error) {
      console.log("error", error)
      return res.json({ error: true })
    }
  }
}
