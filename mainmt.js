
// "multi-thread" version

const lineReader = require('line-reader');
var fs = require('fs');
var request = require('request');
var url = require("url");
var path = require("path");
var uuid = require("uuid");
var utf8 = require("utf8");
var log = require('single-line-log').stdout;

var config = { concurrency: 10, delay: 0};

module.exports = (filename, directory) => {
    
    if(fs.existsSync("config.json")){
        console.log("Lendo configurações...");
        try{
            let getConfig = fs.readFileSync('config.json');
            if(!getConfig) throw "Falha ao ler arquivo config.json";

            // remove comments from json file
            newconfig = eval("y = " + getConfig.toString());

            if(typeof newconfig !== "object") throw "Falha ao ler arquivo config.json";

            // apply new config
            config = newconfig;
        } catch(e){
            console.error("Falha ao ler arquivo json config.json. Usando configurações padrão: " + JSON.stringify(config), e);
        }
    } else {
        console.log("Arquivo config.json não encontrado. Utilizando configurações padrão: " + JSON.stringify(config));
    }

    console.log("Iniciando leitura do arquivo .txt...");

    var logger = fs.createWriteStream('log.txt', { flags: 'w' });

    return baixar(filename, directory, logger);
}

function baixar(filename, directory, logger){
    return new Promise(theend => {
        // set default list filename
        if(typeof filename === "undefined" || !filename)
            filename = "lista.txt";

        // set default destination folder name
        if(typeof directory === "undefined" || !directory)
            directory = "./baixados/";

        console.log("A lista de imagens para download deve estar uma por linha em um arquivo chamado lista.txt");
        console.log("Os arquivos baixados estarão na pasta 'baixados'");

        // create dir if not exists
        if (!fs.existsSync(directory)){
            fs.mkdirSync(directory);
            directory = "./" + directory + "/";
        }

        var count = {
            links: 0,
            started: 0,
            finished: 0,
            errors: 0
        }

        // create download function
        var download = async function(uri, filename, cb){
            count.started++;

            log("Download linha " + (count.started + count.errors) + "/" + count.links);

            return new Promise(resolve => {
                // try to get head request first
                request.head(uri, function(err, res, body){
                    try{
                        var data = request({
                            headers: {
                                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                            },
                            method: "GET",
                            url: utf8.encode(uri)
                        });
                        data.on("error", error => {
                            logger.write(new Date() + ' - Erro: ' + uri + "("+error.message+")\r\n")
                            console.error("\r\nNão foi possível baixar ", uri, "\r\n");
                            count.started--;
                            count.errors++;
                            resolve()
                        });
                        data.pipe(fs.createWriteStream(filename)).on('close', function(){
                            count.finished++;
                            resolve()
                        });
                    } catch(e){
                        logger.write(new Date() + ' Não foi possível baixar ' + uri + "\r\n")
                        console.error("\r\nNão foi possível baixar ", uri, "\r\n");
                        count.started--;
                        count.errors++;
                        resolve()
                    }
                });
            })
        };

        async function worker(arg, cb){

            if(config.delay)
                await sleep(config.delay);

            await download(arg.line, arg.finalname, cb);
            cb();
        }

        // start queue workers
        var queue = require("fastq")(worker, config.concurrency);
        queue.pause();

        function waitEmpty(cb){
            setTimeout(function(){
                // wait for all downloads queued finish & queue empty
                if(queue.length() || count.started > count.finished)
                    return waitEmpty(cb);
                return cb();
            }, 200);
        }

        logger.write(new Date() + ' - Iniciando execução (concurrency=' + config.concurrency + ' | delay=' + config.delay + ') \r\n');
        logger.write(' - Leitura do arquivo lista.txt iniciada' + "\r\n\r\n")

        console.log("\r\n"); // before log();

        // read each line & download file by worker
        lineReader.eachLine(filename, async function(line, last, cb) {
            count.links++;

            log("Lendo linha " + count.links)

            let finalname = directory + getName(line, directory);

            // add this url line on queue worker
            queue.push({line:line, finalname: finalname, cb:cb}, (err, result) => {
                if (err) console.error(err);
            });
            
            cb()
        }, (err) => { // FINISHED READING FILE
            
            console.log("\r\n"); // before log();

            if(err)
                logger.write(new Date() + ' - Erro: ' + err + "\r\n")
            
            console.log("\r\nLeitura do arquivo txt realizada. " + count.links + " links lidos.\r\n");
            logger.write(new Date() + ' - Leitura do arquivo finalizada. ' + count.links + " links lidos. Aguardando finalização dos downloads." + "\r\n");

            // start queue
            queue.resume();

            // wait for empty queue to end program.
            waitEmpty(function(){
                console.log("\r\n");

                logger.write(new Date() + ' - Downloads finalizados. ' + count.finished + " arquivos baixados. " + count.errors + " links com erros." + "\r\n");
                console.log(count.finished + " downloads finalizados, " + count.errors + " links com erros.");

                // 
                theend();
            });
        })

    });
};

// pega nome do arquivo
function getName(link, directory){
    var parsed = url.parse(link);
    var name = path.basename(parsed.pathname);

    if(fs.existsSync(directory + name))
        name = name.replace(/(.*)(\.[a-z]{3,4})$/i, "$1_"+uuid.v4()+"$2")

    // cria novo nome
    if(name.length < 4 || !name.match(/.*\.(jpg|jpeg|gif|png|apng|webp)/gi))
        name = uuid.v4() + ".jpg";

    return name;
}

function sleep(time){
    return new Promise(resolve => {
        setTimeout(resolve, time);
    });
}