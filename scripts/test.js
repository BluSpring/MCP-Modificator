const htmlparser = require('htmlparser2');
const axios = require('axios');

let ent = false;
let inDl = false;

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
    ontext: function(text){
        if (ent && inDl)
            console.log(text);
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

axios.get('http://export.mcpbot.bspk.rs/snapshot/').then(res => {
    if (res.status == 200) {
        parser.write(res.data);
        parser.end();
    } else {
        console.error(`Error - MCPbot is offline!`);
    }
});