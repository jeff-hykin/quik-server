//
// Library Imports
//
const fs = require("fs")
const path = require("path")
const express = require("express")
const Bundler = require("parcel-bundler")
const http = require('http')
const socketIo = require('socket.io')
const { promisify } = require('util')

// a helper function that recusively gets all the files in a directory
async function getFiles(dir) {
    const readdir = promisify(fs.readdir)
    const stat    = promisify(fs.stat)
    const subdirs = await readdir(dir)
    const files   = await Promise.all(
        subdirs.map(async subdir => {
            const res = path.resolve(dir, subdir)
            return (await stat(res)).isDirectory() ? getFiles(res) : res
        })
    )
    return files.reduce((a, f) => a.concat(f), [])
}

// a helper function that returns the absolutePath from the relative path
function absolutePath(relativeLocation) {
    return path.join(__dirname, relativeLocation)
}

const server = {
    settings : {},
    defaultSettings: {
        port: 3000,
        websiteFile: "./website.jsx",
        codeFolder: "./code",
        computerGeneratedFolder: "./computer-generated-code",
        bundlerOptions: { // see https://parceljs.org/api.html for options
            outDir: './computer-generated-code/dist',
            cacheDir: './computer-generated-code/.cache',
            outFile: 'index.html',
        },
        middlewareSetup: () => {
            // add your own!
        },
        onStart: () => {
            console.log("Running on port: ", server.settings.port)
        },
        // automatically import any backend function named ".backend.js"
        automaticBackendImporter : (fileName) => fileName.match(/\.backend\.js+$/),
    },
    beforeStart: async () => {
        // 
        // Standard middleware
        // 
        server.app.use(express.json())
        server.app.use(express.urlencoded({ extended: false }))
        

        // 
        // Setup wrapping files
        // 
        // TODO remove everything in computer-generated on reload
        // TODO create computer-generated if it doesnt exist
        // add js library
        let jsLibraryLocation = `${server.settings.computerGeneratedFolder}/special.js`
        fs.writeFile(jsLibraryLocation, `require("good-dom").global()`, err => err && console.log(err))
        // create the html file
        let locationOfHtml = `${server.settings.computerGeneratedFolder}/.website.html`
        fs.writeFile(locationOfHtml, `<body></body><script src="../${jsLibraryLocation}"></script><script src="../${server.settings.websiteFile}"></script>`, err => err && console.log(err))
        
        // 
        // Setup bundler
        //
        server.app.use(express.static(server.settings.computerGeneratedFolder))
        server.bundler = new Bundler(absolutePath(locationOfHtml), server.settings.bundlerOptions)
        // Let express use the bundler middleware, this will let Parcel handle every request over your express server
        server.app.use(server.bundler.middleware())
        
        //
        // Setup backend connections
        //
        let listOfFiles = await getFiles(server.settings.codeFolder)
        let backendFunctions = []
        for (let each of listOfFiles) {
            // if the function returns truthy
            if (server.settings.automaticBackendImporter(each)) {
                // then import the file
                let importedModule = require(each);
                // if its a function then include it
                if (importedModule instanceof Function) {
                    backendFunctions[each] = importedModule;
                }
            }
        }
        server.io.on('connection', (socket) => {
            // setup a listener for the function
            socket.on("backend", async ({ functionPath, argument }) => {
                // send the output right back to the client
                socket.emit('backendResponse', await backendFunctions[functionPath](argument))
            })
        })
    },
    start: async () => {
        // apply the settings
        server.settings = Object.assign(server.defaultSettings, server.settings)
        // 
        server.beforeStart()
        server.settings.middlewareSetup()
        server.httpServer.listen(server.settings.port, server.settings.onStart)
    }
}

// 
// Setup Express
// 
server.app = express()
server.httpServer = http.Server(server.app)
server.io = socketIo(server.httpServer, { origins: '*:*' })

module.exports = server