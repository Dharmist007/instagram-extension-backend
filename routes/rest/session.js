const path = require("path")
const { IgApiClient } = require("instagram-private-api")
const { writeFile, readFile, access } = require("fs/promises")
const User = require("../../models/user")

// Save session
async function instaSessionSave(data) {
  try {
    const filePath = path.join(__dirname, "login-data.json")
    await writeFile(filePath, JSON.stringify(data))
    console.log("Saved IG Session")
  } catch (err) {
    console.error("Error saving IG Session:", err)
    throw new Error("Failed to save IG Session")
  }
}

// Check if session exists
async function instaSessionExists() {
  try {
    const filePath = path.join(__dirname, "login-data.json")
    await access(filePath)
    return true
  } catch (err) {
    return false
  }
}

// Load IG session data
async function instaSessionLoad() {
  try {
    const filePath = path.join(__dirname, "login-data.json")
    const data = await readFile(filePath, "utf8")
    console.log("Loaded IG Session")
    return JSON.parse(data)
  } catch (err) {
    console.error("Error loading IG Session:", err)
    throw new Error("Failed to load IG Session")
  }
}

module.exports = {
  async sessionStore(req, res) {
    const ig = new IgApiClient()
    const userData = await User.findOne({}).lean()
    // ig.state.generateDevice('kname50');
    ig.state.generateDevice("insta_pixel_details")
    ig.state.deviceId = "android-7b7e633c301f9767"
    ig.state.uuid = "android-7b7e633c301f9767"
    ig.state.phoneId = "46abcd90-c1d7-512c-9922-3ea910e4e62e"
    ig.state.adid = "27b52572-d8a0-583b-8078-64c0897f3577"
    ig.state.deviceString = "26/8.0.0; 480dpi; 1080x2076; samsung; SM-G960F; starlte; samsungexynos9810"
    ig.state.build = "LMY48M"
    console.log("*********----------", ig.state)

    try {
      if (await instaSessionExists()) {
        console.log("IG Session Exists")

        const sessionData = await instaSessionLoad()
        // const sessionData = await User.findOne({}).lean()
        // console.log("---------------////////", sessionData)
        await ig.state.deserialize(sessionData)

        // const selfInfo = await ig.account.currentUser();
        // console.log('Session Validated:', selfInfo);

        console.log("cookieUserId-------------------------", ig.state.cookieUserId)
        const userInfo = await ig.user.info(ig.state.cookieUserId)
        console.log("IG Session Deserialized")

        const followersFeed = ig.feed.accountFollowers(ig.state.cookieUserId)
        let allFollowers = []
        let page = 1

        // Fetch followers with pagination
        do {
          // eslint-disable-next-line no-await-in-loop
          const followers = await followersFeed.items() // Get current page
          console.log(`Page ${page}: Retrieved ${followers.length} followers`)

          // Process each follower
          followers.forEach((follower) => {
            console.log(`Follower: ${follower.username}`)
          })

          const curPageUserIds = followers.map((follower) => follower.pk)

          // eslint-disable-next-line no-await-in-loop

          allFollowers = allFollowers.concat(followers) // Append to the list
          page += 1
        } while (followersFeed.isMoreAvailable() && allFollowers.length < 100)
        return res.status(200).json({
          data: allFollowers.map((el) => el.username),
        })
      }

      console.log("No IG Session Found. Proceeding with Login.")

      // Login
      await ig.simulate.preLoginFlow()
      ig.request.end$.subscribe(async () => {
        console.log("------------")

        const serialized = await ig.state.serialize()
        delete serialized.constants
        await instaSessionSave(serialized)
      })

      // const loggedInUser = await ig.account.login('kname50', 'Insta@654321')
      const loggedInUser = await ig.account.login("insta_pixel_details", "Logic@123456")
      console.log("IG Account Logged In Successfully")
      return res.status(200).json({
        message: "Login Successful",
        data: loggedInUser,
      })
    } catch (err) {
      console.error("Error during session handling:", err)
      return res.status(500).json({
        error: true,
        message: err.message,
      })
    }
  },
}
