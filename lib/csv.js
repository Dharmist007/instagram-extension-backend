const csv = require("csv-parser")
const fs = require("fs")

module.exports = {
  parseCSV(filePath) {
    const results = []

    // Wrapping the CSV read stream in a Promise to use async/await
    return new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv())
        .on("data", (data) => results.push(data)) // Push each row into results
        .on("end", () => resolve(results)) // Resolve with results array when done
        .on("error", (error) => reject(error)) // Reject on error
    })
  }

}
