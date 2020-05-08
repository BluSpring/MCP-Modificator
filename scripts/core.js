const fs = require('fs');
const fse = require('fs-extra')
const axios = require('axios');
const child_process = require('child_process');
const path = require('path');
const os = require('os');
const promisify = require('util').promisify;
const readline = require('readline');
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

if(os.release().split('.')[0] !== '10') {
    console.error(`This script requires Windows 10 to be used!`);
    process.exit(1);
}

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
            const unzipper = child_process.spawn(`powershell.exe`, [`-File`, `./unzip.ps1`, `./lib/mcp`, `./temp/mcp.zip`]);

            unzipper.on('exit', (code, signal) => {
                if(code == 1) {
                    console.error(`Unzipping failed! You may have PowerShell's execution policy set to "Restricted"!\nTo fix this, open PowerShell as an administrator, then run "Set-ExecutionPolicy -ExecutionPolicy Unrestricted -Scope LocalMachine".\nAfter you're done with MCP-Modificator, run "Set-ExecutionPolicy -ExecutionPolicy Restricted -Scope LocalMachine" to bring it back to its original state.`);
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
    if(!fs.existsSync(path.resolve(path.join(__dirname, '../lib/mcpconfig')))) {
        let writer = fs.createWriteStream(path.resolve(path.join('./temp/mcpconfig.zip')));
        console.log(`>>> MCPConfig not detected! Downloading... <<<`);
        curtime = Date.now();
        const res = await axios.get(`https://github.com/MinecraftForge/MCPConfig/archive/master.zip`, {responseType: 'stream'});
        res.data.pipe(writer);
        
        writer.on('close', async () => {
            console.log(`>>> MCPConfig downloaded! Took ${Date.now()-curtime}ms. Unzipping... <<<`);
            //const unzipper = child_process.exec(`${path.resolve(path.join(__dirname, '../unzip.ps1'))} ${path.resolve(path.join(__dirname, '../lib/mcpconfig'))} ${path.resolve(path.join(__dirname, '../temp/mcpconfig.zip'))}`);
            const unzipper = child_process.spawn(`powershell.exe`, [`-File`, `./unzip.ps1`, `./lib/mcpconfig`, `./temp/mcpconfig.zip`]);

            unzipper.on('exit', (code, signal) => {
                if(code == 1) {
                    console.error(`Unzipping failed! You may have PowerShell's execution policy set to "Restricted"!\nTo fix this, open PowerShell as an administrator, then run "Set-ExecutionPolicy -ExecutionPolicy Unrestricted -Scope LocalMachine".\nAfter you're done with MCP-Modificator, run "Set-ExecutionPolicy -ExecutionPolicy Restricted -Scope LocalMachine" to bring it back to its original state.`);
                    process.exit(1);
                }
                console.log(`Finished unzipping and downloading MCPConfig. Took ${Date.now() - curtime}ms.`);
                run_gradle();
            });
            unzipper.stderr.on('data', data => {console.error(`Err - ${data}`)});
            unzipper.stdin.end();
        });
    } else {
        console.log(`MCPConfig detected.`);
        console.warn(`WARNING :: MCPConfig may be outdated, if that is the case please delete the "lib/mcpconfig" folder and rerun this script!`);
        run_gradle();
    }
}

async function run_gradle() {
    if(fs.existsSync(path.resolve(path.join(__dirname, `../lib/mcpconfig/MCPConfig-master/build/versions/${version.join('.')}`))))
        return move_files();
    console.log(`>>> Running Gradle for version ${version.join('.')}. This may take a while. <<<`);
    const gradlew = child_process.exec(`"${path.resolve(path.join(__dirname, '../lib/mcpconfig/MCPConfig-master/gradlew.bat'))}" :${version.join('.')}:projectClientApplyPatches`);
    gradlew.on('exit', (code) => {
        if(code == 1) {
            console.error(`Gradle failed! Unsure what the cause is at the moment.\nIf need be, open "lib/mcpconfig/MCPConfig-master" in command prompt or Windows Powershell, and run "gradlew :${version.join('.')}:projectClientApplyPatches".`);
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
    fs.copyFileSync(readdirRecursive(path.resolve(path.join(__dirname, '../lib/mcpconfig/MCPConfig-master/build/libraries/net/minecraftforge/forgeflower')))[0], path.resolve(path.join(__dirname, '../lib/mcp/runtime/bin/fernflower.jar')));
    fs.copyFileSync(readdirRecursive(path.resolve(path.join(__dirname, '../lib/mcpconfig/MCPConfig-master/build/libraries/de/oceanlabs/mcp/mcinjector')))[0], path.resolve(path.join(__dirname, '../lib/mcp/runtime/bin/mcinjector.jar')));
    fs.copyFileSync(readdirRecursive(path.resolve(path.join(__dirname, '../lib/mcpconfig/MCPConfig-master/build/libraries/net/md-5/SpecialSource')))[0], path.resolve(path.join(__dirname, '../lib/mcp/runtime/bin/specialsource.jar')));
    axios.get('http://export.mcpbot.bspk.rs/fields.csv', {responseType: 'stream'})
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
    run_fixer();
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