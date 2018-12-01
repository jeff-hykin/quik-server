const fs = require("fs")
const path = require("path")
const execSync = require('child_process').execSync;

// a helper for installing node modules
let nodeModuleNames = []
module.exports.makeSureModuleExists = (moduleName) => {
    let whereNodeModulesShouldBe = path.join(process.cwd(), "node_modules")
    // if nodeModuleNames is empty
    if (nodeModuleNames.length == 0) {
        // then populate it
        nodeModuleNames = fs.readdirSync(whereNodeModulesShouldBe)
    }
    // if the module isnt included then install it
    if (!nodeModuleNames.includes(moduleName)) {
        console.log(`\n\nThe module ${moduleName} doesn't seem to be installed\n    You can install modules with:     npm install -s MODULE_NAME\n    I'll go ahead and install ${moduleName} for you`)
        execSync(`npm install -s ${moduleName}`)
    }
}

// a helper function that returns the absolutePath from the project
module.exports.absolutePath = function(relativeLocation) {
    return path.join(process.cwd(), relativeLocation)
}