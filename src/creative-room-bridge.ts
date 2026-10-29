import {BandRuntime} from './runtime';
import {EventStore} from './store';
export type RoomReview = {schema:'groove-room/cannon-review/v1';origin:'CANNON_LOCAL_SYNTHETIC';sourceParcelSha256:string;returnParcelSha256:string;parentParcelSha256:string;sender:'FICTIONAL_A';recipient:'FICTIONAL_B';rights:'SENDER_ASSERTION_NOT_VERIFIED_LICENSE';semanticEffect:'none';transmitted:false;realParticipants:0;publicationAuthorized:false;decision:'INTERESTING'|'KEEP'|'WRONG'|'REFUSE'};
const SHA=/^sha256:[a-f0-9]{64}$/;
function hold(v:unknown,why:string):asserts v{if(!v)throw Error('ROOM_BRIDGE_REFUSE_'+why)}
export function reviewGrooveRoom(x:RoomReview){
 hold(x&&typeof x==='object'&&Object.keys(x).sort().join('|')===['schema','origin','sourceParcelSha256','returnParcelSha256','parentParcelSha256','sender','recipient','rights','semanticEffect','transmitted','realParticipants','publicationAuthorized','decision'].sort().join('|'),'FIELDS');
 hold(x.schema==='groove-room/cannon-review/v1'&&x.origin==='CANNON_LOCAL_SYNTHETIC','ORIGIN');
 hold(SHA.test(x.sourceParcelSha256)&&SHA.test(x.returnParcelSha256)&&x.sourceParcelSha256!==x.returnParcelSha256,'HASH_SHAPE');
 hold(x.parentParcelSha256===x.sourceParcelSha256,'ANCESTRY');
 hold(x.sender==='FICTIONAL_A'&&x.recipient==='FICTIONAL_B'&&x.realParticipants===0&&x.transmitted===false,'REAL_PERSON_OR_TRANSPORT');
 hold(x.rights==='SENDER_ASSERTION_NOT_VERIFIED_LICENSE'&&x.publicationAuthorized===false&&x.semanticEffect==='none','RIGHTS');
 hold(['INTERESTING','KEEP','WRONG','REFUSE'].includes(x.decision),'DECISION');
 const sessionId='synthetic-room',r=new BandRuntime();
 r.dispatch({id:'s0',type:'session.opened',sessionId,timestamp:0,payload:{sessionId}});
 r.dispatch({id:'c1',type:'capture.recorded',sessionId,timestamp:1,payload:{actorId:'FICTIONAL_A',material:{kind:'file',artifactRef:'synthetic:'+x.sourceParcelSha256,sha256:x.sourceParcelSha256},intent:null,localObservedAt:null,parentCaptureId:null}});
 r.dispatch({id:'h2',type:'handoff.recorded',sessionId,timestamp:2,payload:{actorId:'FICTIONAL_A',sourceCaptureIds:['c1'],destination:'FICTIONAL_B_LOCAL_PROPOSAL',outbound:{completeness:'PARTIAL',sha256:x.sourceParcelSha256},delivery:{status:'DECLARED',evidence:[],reason:'NOT_SENT'}}});
 r.dispatch({id:'r3',type:'return.recorded',sessionId,timestamp:3,payload:{actorId:'FICTIONAL_B',provider:'SYNTHETIC_GROOVE',providerArtifactId:null,observed:{artifactRef:'synthetic:'+x.returnParcelSha256},relation:{handoffId:'h2',status:'CLAIMED',evidence:[],reason:'NOT_AUTHENTICATED'}}});
 r.dispatch({id:'d4',type:'decision.recorded',sessionId,timestamp:4,payload:{actorId:'FICTIONAL_A',returnId:'r3',decision:x.decision,note:null}});
 const restored=new BandRuntime(EventStore.deserialize(r.getStore().serialize()));
 hold(restored.getStore().getAll().length===5&&restored.getSemanticInputs().length===0&&restored.getProjection().clips.size===0,'REPLAY_SEMANTICS');
 return {schema:'band-runtime/room-encounter-review/v1',status:'SYNTHETIC_WITNESS_ONLY',originParcelHash:x.sourceParcelSha256,returnParcelHash:x.returnParcelSha256,witnessEvents:restored.getStore().getAll(),semanticInputs:0,actualRoomWrites:0,sourceAuthenticated:false,rightsVerified:false,published:false,humanActs:0};
}
