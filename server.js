import http from 'node:http';
import {readFile} from 'node:fs/promises';
const files = ['index.html','app.js','pricing.js','style.css','manifest.webmanifest','sw.js','icons/icon-192.png','icons/icon-512.png','icons/apple-touch-icon.png'];
const mime = {js:'text/javascript',css:'text/css',html:'text/html; charset=utf-8',webmanifest:'application/manifest+json',png:'image/png'};
http.createServer(async(req,res)=>{
 const pathname=new URL(req.url,'http://localhost').pathname;
 // Mirror the GitHub Pages subdirectory locally for installation testing.
 const route=pathname.startsWith('/poupa/')?pathname.slice('/poupa/'.length):pathname.slice(1);
 const file=route||'index.html';
 if(!files.includes(file)){res.writeHead(404);res.end();return;}
 try{const data=await readFile(new URL(file,import.meta.url));res.setHeader('Content-Type',mime[file.split('.').pop()]);res.setHeader('Cache-Control','no-cache');res.end(data);}catch{res.writeHead(500);res.end('Erro ao carregar.');}
}).listen(process.env.PORT||3000,'0.0.0.0',()=>console.log('Poupa iniciado na porta '+(process.env.PORT||3000)));
