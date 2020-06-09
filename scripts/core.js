const fs = require('fs');
const axios = require('axios');
const child_process = require('child_process');
const path = require('path');
const os = require('os');
const readline = require('readline');
const htmlparser = require('htmlparser2');
async function input(logToConsole) {
    return new Promise((resolve) => {
        const rl = readline.createInterface(process.stdin, process.stdout);

        rl.question(logToConsole, (ans) => {
            resolve(ans);

            rl.close();
        });
    });
}

let java = ``;
let version;
let curtime;

function readdirRecursive(directory) {
    const result = [];

    (function read(dir) {
        const files = fs.readdirSync(dir);

        for (const file of files) {
            const filepath = path.join(dir, file);

            if (fs.statSync(filepath).isDirectory()) {
                read(filepath);
            } else {
                result.push(filepath);
            }
        }
    }(directory));

    return result;
}

const deleteFolderRecursive = async function(pathh) {
    if (fs.existsSync(pathh)) {
        fs.readdirSync(pathh).forEach((file, index) => {
            const curPath = path.join(pathh, file);
            if (fs.lstatSync(curPath).isDirectory()) { // recurse
            deleteFolderRecursive(curPath);
            } else { // delete file
            fs.unlinkSync(curPath);
            }
        });
        fs.rmdirSync(pathh);
    }
};

console.log(`-=-=-=-=-=-=-=-=-=-=-`);
console.log(`   MCP Modificator`);
console.log(`-=-=-=-=-=-=-=-=-=-=-`);
console.log(`> Created by BluSpring <`);
console.log(`Report any errors at https://github.com/BluSpring/MCP-Modificator/issues/new`);
console.log(`\n`);

async function download_mcp() {
    if(!fs.existsSync(path.resolve(path.join(__dirname, '../lib/mcp')))) {
        let writer = fs.createWriteStream(path.resolve(path.join('./temp/mcp.zip')));
        console.log(`>>> MCP not detected! Downloading... <<<`);
        curtime = Date.now();
        const res = await axios.get(`http://www.modcoderpack.com/files/mcp940.zip`, {responseType: 'stream'});
        res.data.pipe(writer);
        
        writer.on('close', async () => {
            console.log(`>>> MCP downloaded! Took ${Date.now() - curtime}ms. Unzipping... <<<`);
            //const unzipper = child_process.exec(`${path.resolve(path.join(__dirname, '../unzip.ps1'))} ${path.resolve(path.join(__dirname, '../lib/mcp'))} ${path.resolve(path.join(__dirname, '../temp/mcp.zip'))}`);
            let unzipper;
            
            if (os.platform() == 'win32')
                unzipper = child_process.spawn(`powershell.exe`, [`-File`, `./unzip.ps1`, `./lib/mcp`, `./temp/mcp.zip`]);
            else
                unzipper = child_process.spawn(`unzip`, [`./temp/mcp.zip`, `-d`, `./lib/mcp`]);
            unzipper.on('exit', (code) => {
                if(code == 1) {
                    if (os.platform() == 'win32')
                        console.error(`Unzipping failed! You may have PowerShell's execution policy set to "Restricted"!\nTo fix this, open PowerShell as an administrator, then run "Set-ExecutionPolicy -ExecutionPolicy Unrestricted -Scope LocalMachine".\nAfter you're done with MCP-Modificator, run "Set-ExecutionPolicy -ExecutionPolicy Restricted -Scope LocalMachine" to bring it back to its original state.`);
                    else
                        console.error(`Unzipping failed! Check the logs for more info.`);
                        
                    process.exit(1);
                }
                console.log(`Finished unzipping and downloading MCP. Took ${Date.now() - curtime}ms`);
                download_mcpconfig();
            });

            unzipper.stderr.on('data', data => {console.error(`Err - ${data}`)});
            unzipper.stdin.end();
        });
    } else {
        console.log(`MCP detected.`);
        download_mcpconfig();
    }
}

async function download_mcpconfig() {
    if (fs.existsSync(path.resolve(path.join(__dirname, '../lib/mcpconfig'))) && fs.existsSync(path.resolve(path.join(__dirname, `../lib/mcpconfig/MCPConfig-master/build/versions/${version.join('.')}`)))) {
        return move_files();
    }
    let writer = fs.createWriteStream(path.resolve(path.join('./temp/mcpconfig.zip')));
    console.log(`>>> Downloading MCPConfig... <<<`);
    curtime = Date.now();
    const res = await axios.get(`https://github.com/MinecraftForge/MCPConfig/archive/master.zip`, {responseType: 'stream'});
    res.data.pipe(writer);
        
    writer.on('close', async () => {
        console.log(`>>> MCPConfig downloaded! Took ${Date.now()-curtime}ms. Unzipping... <<<`);
        //const unzipper = child_process.exec(`${path.resolve(path.join(__dirname, '../unzip.ps1'))} ${path.resolve(path.join(__dirname, '../lib/mcpconfig'))} ${path.resolve(path.join(__dirname, '../temp/mcpconfig.zip'))}`);
        let unzipper;
        
        if (os.platform() == 'win32')
            unzipper = child_process.spawn(`powershell.exe`, [`-File`, `./unzip.ps1`, `./lib/mcpconfig`, `./temp/mcpconfig.zip`]);
        else
            unzipper = child_process.spawn(`unzip`, [`./temp/mcpconfig.zip`, `-d`, `./lib/mcpconfig`]);
        unzipper.on('exit', (code) => {
            if(code == 1) {
                if (os.platform() == 'win32')
                    console.error(`Unzipping failed! You may have PowerShell's execution policy set to "Restricted"!\nTo fix this, open PowerShell as an administrator, then run "Set-ExecutionPolicy -ExecutionPolicy Unrestricted -Scope LocalMachine".\nAfter you're done with MCP-Modificator, run "Set-ExecutionPolicy -ExecutionPolicy Restricted -Scope LocalMachine" to bring it back to its original state.`);
                else
                    console.error(`Unzipping failed! Check the logs for more info.`);
                
                process.exit(1);
            }
            console.log(`Finished unzipping and downloading MCPConfig. Took ${Date.now() - curtime}ms.`);
            run_gradle();
        });
        unzipper.stderr.on('data', data => {console.error(`Err - ${data}`)});
        unzipper.stdin.end();
    });
}

async function run_gradle() {
    if(fs.existsSync(path.resolve(path.join(__dirname, `../lib/mcpconfig/MCPConfig-master/build/versions/${version.join('.')}`))))
        return move_files();

    console.log(`"${path.resolve(path.join(__dirname, `../lib/mcpconfig/MCPConfig-master/${os.platform() == 'win32' ? 'gradlew.bat' : 'gradlew'}`))}" :${version.join('.')}:projectClientApplyPatches`)
    console.log(`>>> Running Gradle for version ${version.join('.')}. This may take a while. <<<`);
    const gradlew = child_process.exec(`"${path.resolve(path.join(__dirname, '../lib/mcpconfig/MCPConfig-master/gradlew'))}" :${version.join('.')}:projectClientApplyPatches`);
    gradlew.on('exit', (code) => {
        if(code == 1) {
            console.error(`Gradle failed! Unsure what the cause is at the moment.\nIf need be, open "lib/mcpconfig/MCPConfig-master" in command prompt or Windows Powershell, and run "gradlew :${version.join('.')}:projectClientApplyPatches".\nAfter you're done, rerun the script and see what happens.`);
            process.exit(1);
        }
        move_files();
    });
    gradlew.stdout.on('data', data => {
        console.log(`Gradle > ${data}`);
    });
    gradlew.stderr.on('data', data => {
        console.error(`Gradle Err > ${data}`);
    });
    gradlew.stdin.end();
}

async function move_files() {
    console.log(`>>> Copying and downloading MCP-required stuff... <<<`);
    if (version[0] == '1' && version[1] == '15' && version[2] == '2') {
        let writer = fs.createWriteStream(path.resolve(path.join('./lib/mcp/runtime/bin/fernflower.jar')));
        console.log(`>>> Downloading ForgeFlower 1.5.380.40... <<<`);
        const res = await axios.get(`http://files.minecraftforge.net/maven/net/minecraftforge/forgeflower/1.5.380.40/forgeflower-1.5.380.40.jar`, {responseType: 'stream'});

        res.data.pipe(writer);

        writer.on('close', async () => {
            console.log(`Finished downloading ForgeFlower.`);
        });
    } else
        fs.copyFileSync(readdirRecursive(path.resolve(path.join(__dirname, '../lib/mcpconfig/MCPConfig-master/build/libraries/net/minecraftforge/forgeflower')))[0], path.resolve(path.join(__dirname, '../lib/mcp/runtime/bin/fernflower.jar')));
    fs.copyFileSync(readdirRecursive(path.resolve(path.join(__dirname, '../lib/mcpconfig/MCPConfig-master/build/libraries/de/oceanlabs/mcp/mcinjector')))[0], path.resolve(path.join(__dirname, '../lib/mcp/runtime/bin/mcinjector.jar')));
    fs.copyFileSync(readdirRecursive(path.resolve(path.join(__dirname, '../lib/mcpconfig/MCPConfig-master/build/libraries/net/md-5/SpecialSource')))[0], path.resolve(path.join(__dirname, '../lib/mcp/runtime/bin/specialsource.jar')));
    /*axios.get('http://export.mcpbot.bspk.rs/fields.csv', {responseType: 'stream'})
    .then(res => {
        console.log(`Downloading fields.csv...`);
        res.data.pipe(fs.createWriteStream(path.resolve(path.join(__dirname, '../lib/mcp/conf/fields.csv'))));
    });
    axios.get('http://export.mcpbot.bspk.rs/methods.csv', {responseType: 'stream'})
    .then(res => {
        console.log(`Downloading methods.csv...`);
        res.data.pipe(fs.createWriteStream(path.resolve(path.join(__dirname, '../lib/mcp/conf/methods.csv'))));
    });
    axios.get('http://export.mcpbot.bspk.rs/params.csv', {responseType: 'stream'})
    .then(res => {
        console.log(`Downloading params.csv...`);
        res.data.pipe(fs.createWriteStream(path.resolve(path.join(__dirname, '../lib/mcp/conf/params.csv'))));
    });*/

    let ent = false;
    let inDl = false;
    let latestVersion = null;

    var parser = new htmlparser.Parser({
        onopentag: function(name, attribs){
            if (name == 'tr') {
                ent = true;
            }
    
            if (name == 'td' && ent) {
                if (attribs.class == 'name') {
                    inDl = true;
                }
            }
        },
        ontext: async function(text){
            if (ent && inDl && !latestVersion) {
                console.log(`Found MCP mappings version - ${text}`);
                latestVersion = text;
            }

            if (text.includes(`No files are available`)) {
                console.error(`Failed getting mappings for version ${version.join('.')}! Searching again for slightly lower patch versions...`);

                if (!version[2]) {
                    console.error(`The version you entered seems to be latest! You won't be able to fix MCP at this point in time. Try again later.`);
                    return process.exit(1)
                } else {
                    let newVer = Array.from(version);

                    if (newVer[2] == '1') {
                        newVer = newVer.splice(0,2);
                    } else {
                        newVer[2] = (parseInt(newVer[2]) - 1).toString();
                    }
                    
                    try {
                        const ress = await axios.get(`http://export.mcpbot.bspk.rs/snapshot/${newVer.join('.')}`);
                        parser.write(ress.data);
                        parser.end();
                    } catch (_) {
                        console.error(`Could not find a close mapping! Try again later.`);

                        process.exit(1);
                    }
                }
            }
        }, 
        onclosetag: function (name) {
            if (name == 'tr') {
                ent = false;
            }
    
            if (name == 'td' && inDl && ent) {
                inDl = false;
            }
        }
    }, {decodeEntities: true});

    parser.onend = async () => {
        try {
            if (!latestVersion) return;
            var mappings = fs.createWriteStream(path.resolve(path.join(__dirname, '../temp/mappings.zip')));
            let curtime = Date.now();
            const reso = await axios.get(`http://export.mcpbot.bspk.rs/mcp_snapshot/${latestVersion.slice(13).split('').reverse().slice(4).reverse().join('')}/${latestVersion}`, {responseType: 'stream'});
            console.log(`Downloading MCP mappings...`);
            reso.data.pipe(mappings);

            mappings.on('close', async () => {
                mappings.close();
                mappings.end();
                mappings.destroy();
                console.log(`Unzipping MCP mappings...`);
                /**
                 * @type {NodeJS.Process}
                 */
                let unzipper;
                setTimeout(() => {
                    if (os.platform() == 'win32')
                        unzipper = child_process.spawn(`powershell.exe`, [`-File`, `unzip.ps1`, `lib\\mappings`, `temp\\mappings.zip`]);
                    else
                        unzipper = child_process.spawn(`unzip`, [`./temp/mappings.zip`, `-d`, `./lib/mappings`]);
                    unzipper.on('exit', (code) => {
                        if(unzipper.stderr.bytesRead >= 10) {
                            if (os.platform() == 'win32') {
                                console.error(`Unzipping failed! You may have PowerShell's execution policy set to "Restricted"!\nTo fix this, open PowerShell as an administrator, then run "Set-ExecutionPolicy -ExecutionPolicy Unrestricted -Scope LocalMachine".\nAfter you're done with MCP-Modificator, run "Set-ExecutionPolicy -ExecutionPolicy Restricted -Scope LocalMachine" to bring it back to its original state.\n\n`);
                                console.error(`If that is not the case, please check the logs for more info.`);
                            } else
                                console.error(`Unzipping failed! Check the logs for more info.`);
                            
                            process.exit(1);
                        }
                        console.log(`Finished unzipping and downloading MCP mappings. Took ${Date.now() - curtime}ms.`);
                        
                        fs.copyFileSync(path.resolve(path.join(__dirname, `../lib/mappings/fields.csv`)), path.resolve(path.join(__dirname, `../lib/mcp/conf/fields.csv`)));
                        fs.copyFileSync(path.resolve(path.join(__dirname, `../lib/mappings/methods.csv`)), path.resolve(path.join(__dirname, `../lib/mcp/conf/methods.csv`)));
                        fs.copyFileSync(path.resolve(path.join(__dirname, `../lib/mappings/params.csv`)), path.resolve(path.join(__dirname, `../lib/mcp/conf/params.csv`)));

                        run_fixer();
                    });

                    unzipper.stderr.on('data', data => {console.error(`Err - ${data}`);});
                    unzipper.stdin.end();
                }, 2000);
            });
        } catch (e) {
            console.error(`Failed to download the mappings! Error: ${e.stack}`);
        }
    }
    
    axios.get('http://export.mcpbot.bspk.rs/snapshot/').then(async res => {
        if (res.status == 200) {
            try {
                console.log(`Getting mappings...`);
                const ress = await axios.get(`http://export.mcpbot.bspk.rs/snapshot/${version.join('.')}`);
                parser.write(ress.data);
                parser.end();
            } catch (_) {
                console.error(`Failed getting mappings for version ${version.join('.')}! Searching again for slightly lower patch versions...`);

                if (!version[2]) {
                    console.error(`The version you entered seems to be latest! You won't be able to fix MCP at this point in time. Try again later.`);
                    return process.exit(1)
                } else {
                    let newVer = Array.from(version);

                    if (newVer[2] == '1') {
                        newVer = newVer.splice(0,2);
                    } else {
                        newVer[2] = (parseInt(newVer[2]) - 1).toString();
                    }
                    
                    try {
                        const ress = await axios.get(`http://export.mcpbot.bspk.rs/snapshot/${newVer.join('.')}`);
                        parser.write(ress.data);
                        parser.end();
                    } catch (_) {
                        console.error(`Could not find a close mapping! Try again later.`);

                        process.exit(1);
                    }
                }
            }
        } else {
            console.error(`Error - MCPbot is offline!`);

            process.exit(1);
        }
    }).catch(e => {
        console.error(`An error occurred whilst trying to get the mappings:\n${e.stack}`);
    });
    try {
        await deleteFolderRecursive(path.resolve(path.join(__dirname, '../lib/mcp/conf/patches')));
        await fs.promises.unlink(path.resolve(path.join(__dirname, '../lib/mcp/conf/exceptor.json')));
        await fs.promises.unlink(path.resolve(path.join(__dirname, '../lib/mcp/conf/joined.exc')));
        await fs.promises.unlink(path.resolve(path.join(__dirname, '../lib/mcp/conf/joined.srg')));
        await fs.promises.unlink(path.resolve(path.join(__dirname, '../lib/mcp/conf/STATIC_METHODS.txt')));
    } catch (e) {}

    await fs.promises.copyFile(path.resolve(path.join(__dirname, `../lib/mcpconfig/MCPConfig-master/build/versions/${version.join('.')}/data/access.txt`)), path.resolve(path.join(__dirname, '../lib/mcp/conf/access.txt')));
    
    await fs.promises.copyFile(path.resolve(path.join(__dirname, `../lib/mcpconfig/MCPConfig-master/build/versions/${version.join('.')}/data/exceptions.txt`)), path.resolve(path.join(__dirname, '../lib/mcp/conf/exceptions.txt')));
    
    await fs.promises.copyFile(path.resolve(path.join(__dirname, `../lib/mcpconfig/MCPConfig-master/build/versions/${version.join('.')}/data/joined.srg`)), path.resolve(path.join(__dirname, '../lib/mcp/conf/joined.srg')));

    await fs.promises.copyFile(path.resolve(path.join(__dirname, `../lib/mcpconfig/MCPConfig-master/versions/${version.join('.')}/constructors.txt`)), path.resolve(path.join(__dirname, '../lib/mcp/conf/constructors.txt')));
    let joinedSrg = (await fs.promises.readFile(path.resolve(path.join(__dirname, '../lib/mcp/conf/joined.srg')))).toString();
    joinedSrg += `
PK: . net/minecraft/src
PK: net net
PK: net/minecraft net/minecraft
PK: net/minecraft/client net/minecraft/client
PK: net/minecraft/client/main net/minecraft/client/main
PK: net/minecraft/realms net/minecraft/realms
PK: net/minecraft/server net/minecraft/server
    `;
    if(parseInt(version[1]) >= 14) {
        joinedSrg += `
PK: com com
PK: com/mojang com/mojang
PK: com/mojang/blaze3d com/mojang/blaze3d
PK: com/mojang/blaze3d/platform com/mojang/blaze3d/platform
        `;
    }
    await fs.promises.writeFile(path.resolve(path.join(__dirname, '../lib/mcp/conf/joined.srg')), joinedSrg);

    let mcpConfig = (await fs.promises.readFile(path.resolve(path.join(__dirname, '../lib/mcp/conf/mcp.cfg')))).toString().split('\n');
    
    if(!mcpConfig[mcpConfig.length-1].includes('DoNotFucking')) {
        mcpConfig[62] = `XClientAccess     = %(DirConf)s/access.txt`;
        mcpConfig[63] = `XServerAccess     = %(DirConf)s/access.txt\r\nXClientExe      = %(DirConf)s/exceptions.txt`;
        mcpConfig[64] = `XServerExe      = %(DirConf)s/exceptions.txt\r\nXClientCfg      = %(DirConf)s/constructors.txt`;
        mcpConfig[65] = `XServerCfg      = %(DirConf)s/constructors.txt`;

        mcpConfig[179] = `CmdExceptor   = %s -jar %s --in {input} --out {output} --ctr {conf} --acc {acc} --exc {exc} --log {log} --lvt=LVT`;
        mcpConfig[180] = `CmdExceptorDry = %s -jar %s --in {input} --ctr {conf} --acc {acc} --exc {exc} --log {log} --lvt=LVT`;
        if(parseInt(version[1]) >= 14) {
            mcpConfig[119] = `IgnorePkg       = paulscode,isom,ibxm,de/matthiasmann/twl,org,javax,argo,gnu,io/netty,oshi,it/unimi`;
        }
        /*mcpConfig = mcpConfig.replace(`
    XClientJson     = %(DirConf)s/exceptor.json
    XServerJson     = %(DirConf)s/exceptor.json
    XClientCfg      = %(DirConf)s/joined.exc
    XServerCfg      = %(DirConf)s/joined.exc
        `,
        `
    XClientAccess     = %(DirConf)s/access.txt
    XServerAccess     = %(DirConf)s/access.txt
    XClientExe      = %(DirConf)s/exceptions.txt
    XServerExe      = %(DirConf)s/exceptions.txt
    XClientCfg      = %(DirConf)s/constructors.txt
    XServerCfg      = %(DirConf)s/constructors.txt
        `);
        mcpConfig = mcpConfig.replace(`
    CmdExceptor   = %s -jar %s --jarIn {input} --jarOut {output} --mapIn {conf} --log {log} --generateParams --lvt=LVT
    CmdExceptorDry = %s -jar %s --jarIn {input} --mapIn {conf} --log {log} --lvt=LVT
        `,
        `
    CmdExceptor   = %s -jar %s --in {input} --out {output} --ctr {conf} --acc {acc} --exc {exc} --log {log} --lvt=LVT
    CmdExceptorDry = %s -jar %s --in {input} --ctr {conf} --acc {acc} --exc {exc} --log {log} --lvt=LVT
        `);

        if(parseInt(version[1]) >= 14) {
            var findIgnorePkg = mcpConfig.split('\n');
            findIgnorePkg = findIgnorePkg.filter(a => a.includes('IgnorePkg'));
            var fixedIgnorePkg = findIgnorePkg[0].replace('com,','');
            mcpConfig = mcpConfig.replace(findIgnorePkg, fixedIgnorePkg);
        }*/

        mcpConfig[mcpConfig.length] = `DoNotFucking  = THIS IS A VALUE THAT IS ADDED BY MCP-MODIFICATOR BECAUSE ITS DUMBASS WONT STOP ADDING MORE LINES TO THE SAME DAMN CODE`;
        await fs.promises.writeFile(path.resolve(path.join(__dirname, '../lib/mcp/conf/mcp.cfg')), mcpConfig.join('\n'));
    }
    let commandsPy = (await fs.promises.readFile(path.resolve(path.join(__dirname, '../lib/mcp/runtime/commands.py')))).toString().split("\n");

    if(!commandsPy[commandsPy.length - 1].includes('DONT TOUCH THIS')) {
        commandsPy[572] = '';
        
        commandsPy[594] = `        self.xclientaccess = os.path.normpath(config.get('EXCEPTOR', 'XClientAccess'))\r\n        self.xserveraccess = os.path.normpath(config.get('EXCEPTOR', 'XServerAccess'))`;
        commandsPy[595] = `        self.xclientexe = os.path.normpath(config.get('EXCEPTOR', 'XClientExe'))\r\n        self.xserverexe = os.path.normpath(config.get('EXCEPTOR', 'XServerExe'))`;

        commandsPy[1410] = `        access = {CLIENT: self.xclientaccess, SERVER: self.xserveraccess}\r\n        exe = {CLIENT: self.xclientexe, SERVER: self.xserverexe}`;

        commandsPy[1413] = `            forkcmd = self.cmdexceptor.format(input=excinput[side], output=excoutput[side], conf=excconf[side], acc=access[side],`;
        commandsPy[1414] = `                                            exc=exe[side], log=exclog[side])`;

        commandsPy[1416] = `            forkcmd = self.cmdexceptordry.format(input=excinputdry[side], conf=excconf[side], acc=access[side],\r\n                                            exc=exe[side], log=exclogdry[side])`;
        /*commandsPy = commandsPy.replace(`jarslwjgl.append(os.path.join(self.dirjars,self.mcLibraries['lwjgl_util']['filename']))`, ``);
        commandsPy = commandsPy.replace(`
    self.xclientjson = os.path.normpath(config.get('EXCEPTOR', 'XClientJson'))
    self.xserverjson = os.path.normpath(config.get('EXCEPTOR', 'XServerJson'))
        `,
        `
    self.xclientaccess = os.path.normpath(config.get('EXCEPTOR', 'XClientAccess'))
    self.xserveraccess = os.path.normpath(config.get('EXCEPTOR', 'XServerAccess'))
    self.xclientexe = os.path.normpath(config.get('EXCEPTOR', 'XClientExe'))
    self.xserverexe = os.path.normpath(config.get('EXCEPTOR', 'XServerExe'))
        `);
        commandsPy = commandsPy.replace(`
    json = {CLIENT: self.xclientjson, SERVER: self.xserverjson}
        `,
        `
    access = {CLIENT: self.xclientaccess, SERVER: self.xserveraccess}
    exe = {CLIENT: self.xclientexe, SERVER: self.xserverexe}
        `);

        commandsPy = commandsPy.replace(`
    forkcmd = self.cmdexceptor.format(input=excinput[side], output=excoutput[side], conf=excconf[side],
                                        log=exclog[side], json=json[side])
        `,
        `
    forkcmd = self.cmdexceptor.format(input=excinput[side], output=excoutput[side], conf=excconf[side], acc=access[side], 
                                        exc=exe[side], log=exclog[side])
        `);

        commandsPy = commandsPy.replace(`
    forkcmd = self.cmdexceptordry.format(input=excinputdry[side], conf=excconf[side], log=exclogdry[side], json=json[side])
        `, 
        `
    forkcmd = self.cmdexceptordry.format(input=excinputdry[side], conf=excconf[side], acc=access[side], 
                                            exc=exe[side], log=exclogdry[side])
        `);*/
        //console.log(commandsPy.join('\r\n'));
        commandsPy[commandsPy.length] = `# DONT TOUCH THIS - This is a comment added by MCP-Modificator because its dumbass won't stop adding the same shit onto more lines. Fuck that shit.`;
        await fs.promises.writeFile(path.resolve(path.join(__dirname, '../lib/mcp/runtime/commands.py')), commandsPy.join('\n'));
    }
    await fs.promises.writeFile(path.resolve(path.join(__dirname, '../lib/mcp/conf/version.cfg')), `
[VERSION]
MCPVersion = 9.41
ClientVersion = ${version.join('.')}
ServerVersion = ${version.join('.')}
    `);
    console.log(`Finished copying and modifying files!`);
}

async function run_fixer() {
    console.log(`>>> Running ThisTestUser's Fixer.jar... <<<`);

    var FixerJar = child_process.exec(`"${java}\\javaw.exe" -jar "${path.resolve(path.join(__dirname, '../lib/Fixer.jar'))}" -i "${path.resolve(path.join(__dirname, `../lib/mcpconfig/MCPConfig-master/versions/${version.join('.')}`))}" -o "${path.resolve(path.join(__dirname, '../lib/mcp/conf'))}"`);
    FixerJar.on('close', (code) => {
        if(code == 1) {
            console.error(`Something happened in the fixer! Not sure what right now.`);
            process.exit(1);
        }

        theEnd();
    });

    FixerJar.stderr.on('data', data => {
        console.error(`Fixer Err > ${data}`);
    });
    FixerJar.stdout.on('data', data => {
        console.error(`Fixer > ${data}`);
    });
}

async function theEnd() {
    console.log(`\nMCP-Modificator should be done now. You can access MCP through "lib/mcp".\nIf you need to do a different version, please delete the MCP foloder and run this script again!`);
    process.exit(0);
}

async function search_for_binaries() {
    version = (await input("What version of Minecraft are you wanting to use?: ")).split('.');
    const ENV_PATH = process.env.PATH.split(';');
    if(!ENV_PATH.find(a => a.includes('Java\\jdk') || a.includes('Java\\jre'))) {
        console.error(`>> ERROR : Java is not detected in your system PATH! <<`)
        process.exit(1);
    } else {
        console.log(`Java detected.`);
        java = ENV_PATH.filter(a => a.includes('Java\\jdk') || a.includes('Java\\jre'))[0];

        download_mcp();
    }
}

search_for_binaries();