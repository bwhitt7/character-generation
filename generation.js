const nunjucks = require("nunjucks");
const fs = require("fs");
const glob = require("glob");
const path = require("path");
var prompt = require("prompt-sync")();

var fileJSON = []; //list of file content to process
var fileNames = []; //list of file names (should be 1-to-1 to the above list)
var fileDirs = []; //location for each file in above list (allows for sub-folders)
var load = {}; //extra json files that get loaded into template files (need to explicitly access them tho)
var folder = process.argv[2]; //gets folder name if given
var folderDir; //name of the character folder

const templateDir = path.resolve(__dirname+"/templates"); //currently all character info and templates are stored here

//if no folder name was given, print a list of available folders
if (!folder){
    //get all characters (minus node_modules)
    const files = fs.readdirSync(templateDir, {withFileTypes: true}) //read current directory
    .filter(dirent => dirent.isDirectory()) //makes sure we're only looking at directory "files"
    .filter(dir => dir.name !="node_modules"); //makes sure its not the node folder
    
    files.forEach((element, i) =>{
        console.log((i+1)+". "+element.name); //print out the names
    })

    //select folder and validate
    while (true){
        var selection = Number(prompt("Select folder number: ", 1)); //select one of the folders by listed number
        //if the answer is a number, and is within the files list, continue
        // (since its incremental, just between 1 and length of files)
        if (!isNaN(selection) && selection <= files.length && selection >= 1)
            break;
        //else, exit
        else if(isNaN(selection)){
            console.log("Exiting...");
            return;
        }
        //if its a number but not within the bounds, invalid, try again
        else
            console.log(">> Invalid selection.");
    }
    //get from files list
    console.log(">> Selected "+files[selection-1].name);
    folderDir = files[selection-1].path+"/"+files[selection-1].name;
    if (!fs.existsSync(folderDir)){
        console.log(">> Folder does not exist!");
        return;
    }
}
else{
    // if folder doesnt exist, exit
    if (!fs.existsSync(templateDir+"/"+folder)){
        console.log(">> Folder does not exist!");
        return;
    }
    else {
        folderDir = templateDir+"/"+folder
    }
}
folderDir = path.resolve(folderDir);

//using glob, get all character input files
//these will be in the "in" subfolder and end with .json
glob.globSync("**/*.json", {cwd: folderDir+"/in"}).forEach((element, i) => {
    fileNames.push(path.basename(element).replace(".json", ""));
    fileDirs.push(path.dirname(element))
    fileJSON.push(JSON.parse(fs.readFileSync(folderDir+"/in/"+element).toString()));
});

//load info/extra files.
//these will be in the root of the folder and start with "!"
glob.globSync("!*.json", {cwd: folderDir}).forEach((element, i) => {
    var loadName = path.basename(element).replace(".json", "").substring(1);
    load[loadName] = JSON.parse(fs.readFileSync(folderDir+"/"+element).toString());
});

//set up nunjucks. this is our templating language
nunjucks.configure(templateDir, { autoescape: true });

//generate html files for all characters
fileJSON.forEach((element, i) => {
    //render nunjuck template with character code
    //load in current character and any load files
    var nj = nunjucks.render(path.resolve(folderDir+"/template.njk"), {char: element, load});
    nj = nj.replace(/^\s*\n/gm, ""); //get rid of excess whitespace
    var extension = ".html"

    //make the output folder if it doesnt exist
    if (!fs.existsSync(folderDir+"/out/")){
        fs.mkdirSync(folderDir+"/out/");
    }
    //if there are subfolders, make sure to generate them and put the output file in them
    //otherwise just put them in the root output folder
    if (fileDirs[i]!="."){
        if (!fs.existsSync(folderDir+"/out/"+fileDirs[i])){
            fs.mkdirSync(folderDir+"/out/"+fileDirs[i]);
        }
        fs.writeFileSync(folderDir+"/out/"+fileDirs[i]+"/"+fileNames[i]+extension, nj);
    }
    else {
       fs.writeFileSync(folderDir+"/out/"+fileNames[i]+extension, nj);
    }
});

//Done!
console.log("Finished generating "+fileJSON.length+" files in "+path.resolve(folderDir+"/out")+"...");