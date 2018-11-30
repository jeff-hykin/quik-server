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

const { getFiles, absolutePath, set } = require("./helpers")

const server = {
    settings : {},
    defaultSettings: {
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
        // generate the backend fucntions
        // 
        let listOfFiles = await getFiles(absolutePath(server.settings.codeFolder))
        let backendFunctions = {}
        let backendObjectForFrontend = {}
        for (let each of listOfFiles) {
            // if the function returns truthy
            if (server.settings.automaticBackendImporter(each)) {
                // then import the file
                let importedModule = require(each);
                // if its a function then include it
                if (importedModule instanceof Function) {
                    // convert "/_Programming/quik-app/code/tryme.backend.js"
                    // into "code/tryme" then into just "tryme"
                    let simplePath = (path.relative(process.cwd(), each)).replace(/(\.backend|)\.js/,"");
                    let findCodeFolder = new RegExp(`\^${server.settings.codeFolder}/`, 'i');
                    simplePath = ("./"+simplePath).replace(findCodeFolder, "")
                    let keyList = simplePath.split("/")
                    set(backendObjectForFrontend, keyList, simplePath)
                    backendFunctions[simplePath] = importedModule;
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

        //
        // Setup wrapping files
        //
        // add a little js to the frontend 
        let jsLibraryLocation = `${server.settings.computerGeneratedFolder}/special.js`
        fs.writeFile(absolutePath(jsLibraryLocation), `
            // good dom Library
            require("good-dom").global()
            // setup of the "backend" object
            window.backend = ${JSON.stringify(backendObjectForFrontend)}
            window.io = require("socket.io-client")
            window.socket = new io.connect("/", {
                'reconnection': false
            })
            // a helper for setting nested values 
            function set(obj, attributeList, value) {
                if (attributeList instanceof Array) {
                    try {
                        var lastAttribute = attributeList.pop()
                        for (var elem of attributeList) {
                            // create each parent if it doesnt exist
                            if (!(obj[elem] instanceof Object)) {
                                obj[elem] = {}
                            }
                            // change the object reference be the nested element
                            obj = obj[elem]
                        }
                        obj[lastAttribute] = value
                    } catch (error) {
                    }
                }
            }
            // a helper for getting nested values 
            var get = (obj, keyList) => {
                for (var each of keyList) {
                    try { obj = obj[each] }
                    catch (e) { return null }
                }
                return obj == null ? null : obj
            }
            // a helper for ... well ..recursively getting All Attributes Of an object
            var recursivelyAllAttributesOf = (obj) => {
                // if not an object then add no attributes
                if (!(obj instanceof Object)) {
                    return []
                }
                // else check all keys for sub-attributes
                var output = []
                for (let eachKey of Object.keys(obj)) {
                    // add the key itself (alone)
                    output.push([eachKey])
                    // add all of its children
                    let newAttributes = recursivelyAllAttributesOf(obj[eachKey])
                    // if nested
                    for (let eachNewAttributeList of newAttributes) {
                        // add the parent key
                        eachNewAttributeList.unshift(eachKey)
                        output.push(eachNewAttributeList)
                    }
                }
                return output
            }
            let callBackend = (functionPath, argument) => {
                socket.emit("backend", { functionPath, argument })
                return new Promise(resolve => socket.on("backendResponse", response => resolve(response)))
            }
            let createBackendCaller = (backendPath) => (argument) => callBackend(backendPath, argument)

            for (let each of recursivelyAllAttributesOf(window.backend)) {
                let value = get(window.backend, each)
                if (value instanceof Object) {
                    continue
                }
                // convert it from a string into a function
                set(window.backend, each, createBackendCaller(value))
            }
        `, err => err && console.log(err))
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
        // apply the settings
        server.settings = Object.assign(server.defaultSettings, server.settings)
        // run setups
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