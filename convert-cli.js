var convertReascale = require("./convert-reascale");
var stringify = require("javascript-stringify");
var stdin = require('get-stdin');

var fs = require("fs");
var path = require("path");
var glob = require("glob");


function getFiles(args) {
    var files = [];
    if (args.all) {
        files = glob.sync("sources/*.reascale");
    } else {
        files = args._.filter(fs.existsSync);
    }
    return files;
};

function dataToCode(data) {
    var code = "/* this file is autogenerated by reascale-js/convert-cli */\nmodule.exports = {\n";
    Object.keys(data).forEach(function (groupName, groupIndex) {
        code += "  " + JSON.stringify(groupName) + ": [\n";
        data[groupName].forEach(function (scale) {
            code += "    " + stringify(scale) + ",\n";
        });
        code += "  ],\n";
    })
    code += "};"
    return code;
};

function gatherOmnibus(fileDatas) {
    var seen = {};
    var omnibusGroups = {};
    fileDatas.forEach(function (data) {
        Object.keys(data).forEach(function (groupName) {
            data[groupName].forEach(function (scale) {
                var semisStr = [].concat(scale.semis).sort().join(";");
                if (!seen[semisStr]) {
                    seen[semisStr] = true;
                    if (omnibusGroups[groupName] === undefined) omnibusGroups[groupName] = [];
                    omnibusGroups[groupName].push(scale);
                }
            });
        });
    });
    return omnibusGroups;
}

function run() {
    var args = require("minimist")(process.argv.slice(2));

    var files = getFiles(args);

    if (!files.length) {
        process.stderr.write("Reading reascale from stdin and writing JS to stdout.\n");
        stdin().then(function(text) {
            var data = convertReascale(text);
            var code = dataToCode(data);
            process.stdout.write(code);
            process.exit(0);
        });
        return;
    }

    var destDir = args["dest-dir"];
    var singleFiles = !!args["single-files"];
    var fileDatas = [];
    files.forEach(function (srcFilename) {
        var text = fs.readFileSync(srcFilename, "UTF-8");
        var data = convertReascale(text);
        var code = dataToCode(data);
        if(singleFiles) {
            var destFilename = srcFilename.replace(".reascale", "") + ".js";
            if (destDir !== undefined) {
                destFilename = path.join(destDir, path.basename(destFilename));
            }
            fs.writeFileSync(destFilename, code, "UTF-8");
            console.info("Single file OK: " + srcFilename + " --> " + destFilename);
        }
        fileDatas.push(data);
    });

    if (args["omnibus"]) {
        var omnibusData = gatherOmnibus(fileDatas);
        var code = dataToCode(omnibusData);
        fs.writeFileSync(args["omnibus"], code, "UTF-8");
        console.info("Omnibus OK: " + args["omnibus"]);
    }
}

run();
