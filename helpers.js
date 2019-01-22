const fs = require("fs")
const path = require("path")
const execSync = require('child_process').execSync;

// a helper for installing node modules
let nodeModuleNames = []
    let whereNodeModulesShouldBe = path.join(process.cwd(), "node_modules")
    // if nodeModuleNames is empty
module.exports.makeSureModuleExists = (moduleName) => {
    if (nodeModuleNames.length == 0) {
        // then populate it
        nodeModuleNames = fs.readdirSync(whereNodeModulesShouldBe)
    }
    // if the module isnt included then install it
    if (!nodeModuleNames.includes(moduleName)) {
        console.log(`\n\nThe module ${moduleName} doesn't seem to be installed\n    I'll go ahead and install ${moduleName} for you\n    You can install modules with:  npm install -s ${moduleName}\n`)
        execSync(`npm install -s ${moduleName}`)
    }
}

// a helper function that returns the absolutePath from the project
module.exports.absolutePath = function(relativeLocation) {
    return path.join(process.cwd(), relativeLocation)
}

// make awaitable if not async (if async then this function effectively does nothing)
module.exports.makeAwaitable = async (outputOfOtherFunction) => outputOfOtherFunction

module.exports.writeFile = (path, data, opts = 'utf8') =>
    new Promise((resolve, reject) => {
        fs.writeFile(path, data, opts, (err) => {
            if (err) reject(err)
            else resolve()
        })
    })