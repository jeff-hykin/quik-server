//
// Library Imports
//
const fs      = require("fs")
const express = require("express")
const Bundler = require("parcel-bundler")
const http    = require('http')
const { makeSureModuleExists, absolutePath } = require("./helpers")

const server = {
    beforeStart: async () => {
        // 
        // Standard middleware
        // 
        server.app.use(express.json())
        server.app.use(express.urlencoded({ extended: false }))

        //
        // Setup wrapping files
        //
        // add a little js to the frontend 
        let jsLibraryLocation = `${server.settings.computerGeneratedFolder}/special.js`
        // get all the frontend code
        let frontendCode = ""
        for (let each of server.frontendCodePeices) {
            let code 
            // if function was async
            if (each instanceof Promise) {
                code = await each
            } else {
                code = each
            }
            frontendCode += `\n;;\n${code}\n;;\n`
        }
        fs.writeFile(absolutePath(jsLibraryLocation), frontendCode, err => err && console.log(err))
        // create the html file
        let locationOfHtml = `${server.settings.computerGeneratedFolder}/.website.html`
        fs.writeFile(absolutePath(locationOfHtml), `<body></body><script src="../${jsLibraryLocation}"></script><script src="../${server.settings.websiteFile}"></script>`, err => err && console.log(err))
        
        // 
        // Setup bundler
        //
        server.app.use(express.static(server.settings.computerGeneratedFolder))
        server.bundler = new Bundler(absolutePath(locationOfHtml), server.settings.bundlerOptions)
        // Let express use the bundler middleware, this will let Parcel handle every request over your express server
        server.app.use(server.bundler.middleware())
    },
    start: async () => {
        // run setups
        server.beforeStart()
        server.settings.middlewareSetup()
        server.httpServer.listen(server.settings.port, server.settings.onStart)
    },
    frontendCodePeices : [],
    quikAdd : (moduleName, ...args) => {
        makeSureModuleExists(moduleName)
        let theModule = require(moduleName)
        // asyncly add it to the frontend code
        if (theModule.generateFrontend instanceof Function) {
            let code = theModule.generateFrontend(server,...args)
            server.frontendCodePeices.push(code)
        }
        return theModule.backend
    }
}
//
// Create the setting setter/getter
//
let privateSettingsObject = Symbol("settings")
// here are the default settings 
server[privateSettingsObject] = {
        port: 3000,
        websiteFile: "./website.jsx",
        codeFolder: "./code",
        computerGeneratedFolder: "./computer-generated-code",
        bundlerOptions: { // see https://parceljs.org/api.html for options
            outDir: absolutePath('./computer-generated-code/dist'),
            cacheDir: absolutePath('./computer-generated-code/.cache'),
            outFile: absolutePath('index.html'),
        },
        middlewareSetup: () => {
            // add your own!
        },
        onStart: () => {
            console.log("Running on port: ", server.settings.port)
        },
    }
Object.defineProperty(server, "settings",{
    get: function() {
        return this[privateSettingsObject]
    },
    set: function(newValue) {
        // override the default settings with new settings
        Object.assign(this[privateSettingsObject], newValue)
    }
})

//
// Setup Express
//
server.app = express()
server.httpServer = http.Server(server.app)

module.exports = server