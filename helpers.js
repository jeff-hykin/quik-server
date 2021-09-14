const fs = require("fs")
const path = require("path")
const execSync = require('child_process').execSync
const { walkUpUntil } = require("@!!!!!/walk-up")

const nodeModulesPath = walkUpUntil("node_modules")

// a helper for installing node modules
let nodeModuleNames = []
module.exports.makeSureModuleExists = (moduleName) => {
    // if nodeModuleNames is empty
    if (nodeModuleNames.length == 0) {
        // then populate it
        nodeModuleNames = fs.readdirSync(nodeModulesPath)
    }
    // if the module isnt included then install it
    if (!nodeModuleNames.includes(moduleName)) {
        console.log(`\n\nThe module ${moduleName} doesn't seem to be installed\n    I'll go ahead and install ${moduleName} for you\n    You can install modules with:  npm install -s ${moduleName}\n`)
        execSync(`npm install -s ${moduleName}`)
    }
}

// a helper function that returns the absolutePath from the project
module.exports.absolutePath = function(relativeLocation) {
    if (path.isAbsolute(relativeLocation)) {
        return relativeLocation
    }
    return path.join(path.dirname(nodeModulesPath), relativeLocation)
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