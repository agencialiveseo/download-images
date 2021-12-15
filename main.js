
// "single-thread" - não usado

const lineReader = require('line-reader');
var fs = require('fs');
var request = require('request');
var url = require("url");
var path = require("path");
var uuid = require("uuid");

module.exports = (filename, directory) => {
    
    console.log("Iniciando leitura do arquivo .txt...");

    return new Promise(theend => {
        if(typeof filename === "undefined" || !filename)
            filename = "lista.txt";

        if(typeof directory === "undefined" || !directory)
            directory = "./baixados/";

        console.log("A lista de imagens para download deve estar uma por linha em um arquivo chamado lista.txt");
        console.log("Os arquivos baixados estarão na pasta 'baixados'");

        // cria o diretório se não existe
        if (!fs.existsSync(directory)){
            fs.mkdirSync(directory);
            directory = "./" + directory + "/";
        }
        
        // pega nome do arquivo
        var getName = function(link){
            var parsed = url.parse(link);
            var name = path.basename(parsed.pathname);

            if(fs.existsSync(directory + name))
                name = name.replace(/(.*)(\.[a-z]{3,4})$/i, "$1_" + uuid.v4() + "$2")

            // cria novo nome
            if(name.length < 4 || !name.match(/.*\.(jpg|jpeg|gif|png|apng|webp)/gi))
                name = uuid.v4() + ".jpg";

            return name;
        }

        // faz o download do arquivo
        var download = async function(uri, filename, cb){
            request.head(uri, function(err, res, body){
                request(uri).pipe(fs.createWriteStream(filename)).on('close', cb);// resolve);
            });
        };

        // lê cada linha e faz o download
        lineReader.eachLine(filename, async function(line, last, cb) {
            
            console.log(line);

            let finalname = directory + getName(line);
            await download(line, finalname, cb);

            console.log("Salvo como " + finalname);
            console.log("-");
            
        }, (err) =>{
            console.log("Concluído.")
            theend();
        })

    });
}