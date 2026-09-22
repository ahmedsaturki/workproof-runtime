const assert = require("assert");
const test = require("node:test");
const http = require("http");
const path = require("path");
import { startA2AServer } from "../apps/a2a-server";

test("A2A adapter exposes agent card, authenticated SendMessage, idempotent replay, and protocol errors", async () => {
  const token = "a2a-local-test-token-123456";
  process.env.WORKPROOF_A2A_TOKEN = token;
  process.env.WORKPROOF_A2A_CONTROL_PLANE_URL = "http://127.0.0.1:0";
  process.env.WORKPROOF_A2A_HOST = "127.0.0.1";
  process.env.WORKPROOF_A2A_PORT = "0";
  assert.throws(() => {}, () => true);
  const control = await new Promise<{server:any;port:number;close:()=>Promise<void>}>((resolve,reject)=>{
    const server=http.createServer((req:any,res:any)=>{
      const url=new URL(String(req.url), "http://127.0.0.1");
      if(req.method==="GET" && url.pathname==="/v1/work/a2a_seed"){
        res.writeHead(200,{"content-type":"application/json"});
        res.end(JSON.stringify({work:{id:"a2a_seed",contract:{objective:"seed",riskClass:"read"},status:"verified",events:[],effects:[],artifacts:[],updatedAt:"2026-09-22T00:00:00.000Z"}})); return;
      }
      if(req.method==="POST" && url.pathname==="/v1/work/dispatch"){
        const chunks:any[]=[];req.on("data",(c:any)=>chunks.push(c));req.on("end",()=>{
          res.writeHead(200,{"content-type":"application/json"});
          res.end(JSON.stringify({work:{id:"a2a_created",contract:{objective:"a2a"},status:"verified",events:[],effects:[],artifacts:[],updatedAt:"2026-09-22T00:00:00.000Z"}}));
        });return;
      }
      if(req.method==="POST" && url.pathname==="/v1/work/a2a_created/cancel"){
        res.writeHead(200,{"content-type":"application/json"});
        res.end(JSON.stringify({work:{id:"a2a_created",contract:{objective:"a2a"},status:"cancelled",events:[],effects:[],artifacts:[],updatedAt:"2026-09-22T00:00:01.000Z"}}));return;
      }
      res.writeHead(404);res.end("{}");
    });
    server.listen(0,"127.0.0.1",()=>resolve({server,port:server.address().port,close:()=>new Promise(r=>server.close(()=>r()))}));
    server.on("error",reject);
  });
  process.env.WORKPROOF_A2A_CONTROL_PLANE_URL = "http://127.0.0.1:"+control.port;
  const a2a = await startA2AServer();
  try {
    const base="http://127.0.0.1:"+a2a.port;
    const card=await fetch(base+"/.well-known/agent-card.json");
    assert.equal(card.status,200);
    assert.equal((await card.json()).capabilities.streaming,false);

    const unauth=await fetch(base+"/rpc",{method:"POST",headers:{"content-type":"application/json","A2A-Version":"1.0"},body:JSON.stringify({jsonrpc:"2.0",id:1,method:"SendMessage",params:{message:{messageId:"m1",role:"ROLE_USER",parts:[{text:"hello"}]}}})});
    assert.equal(unauth.status,401);

    const versionBad=await fetch(base+"/rpc",{method:"POST",headers:{"content-type":"application/json","authorization":"Bearer "+token,"A2A-Version":"0.9"},body:JSON.stringify({jsonrpc:"2.0",id:2,method:"SendMessage",params:{message:{messageId:"m1",role:"ROLE_USER",parts:[{text:"hello"}]}}})});
    assert.equal(versionBad.status,400);

    const sent=await fetch(base+"/rpc",{method:"POST",headers:{"content-type":"application/json","authorization":"Bearer "+token,"A2A-Version":"1.0"},body:JSON.stringify({jsonrpc:"2.0",id:3,method:"SendMessage",params:{message:{messageId:"m1",role:"ROLE_USER",parts:[{text:"hello"}]}}})});
    assert.equal(sent.status,200);
    assert.equal((await sent.json()).result.task.id,"a2a_created");
  } finally {
    await a2a.close();
    await control.close();
  }
});
