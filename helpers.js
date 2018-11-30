// a helper function that recusively gets all the files in a directory
module.exports.getFiles = async function(dir) {
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

// a helper function that returns the absolutePath from the project
module.exports.absolutePath = function(relativeLocation) {
    return path.join(process.cwd(), relativeLocation)
}

// a helper for setting nested values 
module.exports.set = function(obj, attributeList, value) {
        // convert string values into lists
        if (typeof attributeList == 'string') {
            attributeList = attributeList.split('.')
        }
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
                console.warn("the set function was unable to set the value for some reason, here is the original error message",error)
                console.warn(`the set obj was:`,obj)
                console.warn(`the set attributeList was:`,attributeList)
                console.warn(`the set value was:`,value)
            }
        } else {
            console.log(`obj is:`,obj)
            console.log(`attributeList is:`,attributeList)
            console.log(`value is:`,value)
            console.error(`There is a 'set' function somewhere being called and its second argument isn't a string or a list (see values above)`);
        }
    }