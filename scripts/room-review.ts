import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {reviewGrooveRoom,type RoomReview} from '../src/creative-room-bridge';
const [input,output]=process.argv.slice(2);
if(!input||!output||existsSync(resolve(output)))throw Error('USAGE: room-review <input.json> <new-output.json>');
const result=reviewGrooveRoom(JSON.parse(readFileSync(resolve(input),'utf8')) as RoomReview);
writeFileSync(resolve(output),JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({status:result.status,events:result.witnessEvents.length}));
